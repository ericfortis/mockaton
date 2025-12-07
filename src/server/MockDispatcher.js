import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { logger } from './utils/logger.js'
import { mimeFor } from './utils/mime.js'

import { proxy } from './ProxyRelay.js'
import { cookie } from './cookie.js'
import { brokerByRoute } from './mockBrokersCollection.js'
import { config, calcDelay } from './config.js'


export async function dispatchMock(req, response) {
	try {
		const isHead = req.method === 'HEAD'

		let broker = brokerByRoute(req.method, req.url)
		if (!broker && isHead)
			broker = brokerByRoute('GET', req.url)

		if (config.proxyFallback && (!broker || broker.proxied)) {
			await proxy(req, response, broker?.delayed ? calcDelay() : 0)
			return
		}
		if (!broker) {
			response.mockNotFound()
			return
		}

		if (cookie.getCurrent())
			response.setHeader('Set-Cookie', cookie.getCurrent())

		response.statusCode = broker.auto500
			? 500
			: broker.status
		const { mime, body } = broker.auto500
			? { mime: '', body: '' }
			: await applyPlugins(join(config.mocksDir, broker.file), req, response)

		response.setHeader('Content-Type', mime)
		response.setHeader('Content-Length', length(body))

		setTimeout(() =>
			response.end(isHead
				? null
				: body
			), Number(broker.delayed && calcDelay()))

		logger.accessMock(req.url, broker.file)
	}
	catch (error) { // TESTME
		if (error?.code === 'ENOENT') // mock-file has been deleted
			response.mockNotFound()
		else
			response.internalServerError(error)
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
	if (body instanceof Uint8Array) return body.byteLength // Buffers are u8
	return 0
}
