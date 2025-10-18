import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { logger } from './utils/logger.js'
import { proxy } from './ProxyRelay.js'
import { cookie } from './cookie.js'
import { mimeFor } from './utils/mime.js'
import { config, calcDelay } from './config.js'
import * as mockBrokerCollection from './mockBrokersCollection.js'
import { sendInternalServerError, sendMockNotFound } from './utils/http-response.js'


export async function dispatchMock(req, response) {
	try {
		const isHead = req.method === 'HEAD'
		
		let broker = mockBrokerCollection.brokerByRoute(req.method, req.url)
		if (!broker && isHead)
			broker = mockBrokerCollection.brokerByRoute('GET', req.url)
		
		if (config.proxyFallback && (!broker || broker.proxied)) {
			await proxy(req, response, broker?.delayed ? calcDelay() : 0)
			return
		}
		
		if (!broker) {
			sendMockNotFound(response)
			return
		}

		if (cookie.getCurrent())
			response.setHeader('Set-Cookie', cookie.getCurrent())

		for (let i = 0; i < config.extraHeaders.length; i += 2)
			response.setHeader(config.extraHeaders[i], config.extraHeaders[i + 1])

		response.statusCode = broker.status // TESTME plugins can change it
		const { mime, body } = broker.temp500IsSelected
			? { mime: '', body: '' }
			: await applyPlugins(join(config.mocksDir, broker.file), req, response)

		logger.accessMock(req.url, broker.file)
		response.setHeader('Content-Type', mime)
		response.setHeader('Content-Length', length(body))
		setTimeout(() => response.end(isHead ? null : body),
			Number(broker.delayed && calcDelay()))
	}
	catch (error) {
		if (error?.code === 'ENOENT') // mock-file has been deleted
			sendMockNotFound(response)
		else
			sendInternalServerError(response, error)
	}
}

async function applyPlugins(filePath, req, response) {
	for (const [regex, plugin] of config.plugins)
		if (regex.test(filePath))
			return await plugin(filePath, req, response)
	return {
		mime: mimeFor(filePath),
		body: readFileSync(filePath)
	}
}

export async function jsToJsonPlugin(filePath, req, response) {
	const jsExport = (await import(pathToFileURL(filePath) + '?' + Date.now())).default // date for cache busting
	const body = typeof jsExport === 'function'
		? await jsExport(req, response)
		: JSON.stringify(jsExport, null, 2)
	return {
		mime: response.getHeader('Content-Type') || mimeFor('.json'), // jsFunc are allowed to set it
		body
	}
}

function length(body) {
	if (typeof body === 'string') return Buffer.byteLength(body)
	if (Buffer.isBuffer(body)) return body.length
	if (body instanceof Uint8Array) return body.byteLength
	return 0
}
