import { join } from 'node:path'
import { readFileSync as read } from 'node:fs'

import { proxy } from './ProxyRelay.js'
import { cookie } from './cookie.js'
import { Config } from './Config.js'
import { mimeFor } from './utils/mime.js'
import * as mockBrokerCollection from './mockBrokersCollection.js'
import { JsonBodyParserError } from './utils/http-request.js'
import { sendInternalServerError, sendNotFound, sendBadRequest } from './utils/http-response.js'


export async function dispatchMock(req, response) {
	const broker = mockBrokerCollection.getBrokerForUrl(req.method, req.url)
	if (!broker) {
		if (Config.proxyFallback)
			await proxy(req, response)
		else
			sendNotFound(response)
		return
	}

	try {
		const { file, status, delay } = broker
		console.log(decodeURIComponent(req.url), ' → ', file)
		const filePath = join(Config.mocksDir, file)

		let mockBody
		if (file.endsWith('.js')) {
			response.setHeader('Content-Type', mimeFor('.json'))
			const jsExport = await importDefault(filePath)
			mockBody = typeof jsExport === 'function'
				? await jsExport(req, response)
				: JSON.stringify(jsExport, null, 2)
		}
		else {
			response.setHeader('Content-Type', mimeFor(file))
			mockBody = broker.isTemp500
				? ''
				: read(filePath)
		}

		if (cookie.getCurrent())
			response.setHeader('Set-Cookie', cookie.getCurrent())

		response.writeHead(status, Config.extraHeaders)
		setTimeout(() => response.end(mockBody), delay)
	}
	catch (error) {
		if (error instanceof JsonBodyParserError)
			sendBadRequest(response, error)
		else if (error.code === 'ENOENT')
			sendNotFound(response) // file has been deleted
		else
			sendInternalServerError(response, error)
	}
}

async function importDefault(file) {
	return (await import(file + '?' + Date.now())).default // date for cache busting
}
