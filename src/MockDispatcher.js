import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { log } from './utils/log.js'
import { proxy } from './ProxyRelay.js'
import { cookie } from './cookie.js'
import { mimeFor } from './utils/mime.js'
import { config, calcDelay } from './config.js'
import { BodyReaderError } from './utils/http-request.js'
import * as mockBrokerCollection from './mockBrokersCollection.js'
import { sendInternalServerError, sendNotFound, sendUnprocessableContent } from './utils/http-response.js'


export async function dispatchMock(req, response) {
	try {
		const broker = mockBrokerCollection.brokerByRoute(req.method, req.url)
		if (!broker || broker.proxied) {
			if (config.proxyFallback)
				await proxy(req, response, Number(broker?.delayed && calcDelay()))
			else
				sendNotFound(response)
			return
		}

		log.access(req.url, broker.file)
		response.statusCode = broker.status

		if (cookie.getCurrent())
			response.setHeader('Set-Cookie', cookie.getCurrent())

		for (let i = 0; i < config.extraHeaders.length; i += 2)
			response.setHeader(config.extraHeaders[i], config.extraHeaders[i + 1])

		const { mime, body } = broker.temp500IsSelected
			? { mime: '', body: '' }
			: await applyPlugins(join(config.mocksDir, broker.file), req, response)

		response.setHeader('Content-Type', mime)
		setTimeout(() => response.end(body), Number(broker.delayed && calcDelay()))
	}
	catch (error) {
		if (error instanceof BodyReaderError)
			sendUnprocessableContent(response, error.name)
		else if (error.code === 'ENOENT') // mock-file has been deleted
			sendNotFound(response)
		else if (error.code === 'ERR_UNKNOWN_FILE_EXTENSION') {
			if (error.toString().includes('Unknown file extension ".ts'))
				log.warn('\nLooks like you need a TypeScript compiler\n')
			sendInternalServerError(response, error)
		}
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
