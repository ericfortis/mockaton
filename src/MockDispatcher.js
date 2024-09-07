import { join } from 'node:path'
import { readFileSync } from 'node:fs'

import { proxy } from './ProxyRelay.js'
import { cookie } from './cookie.js'
import { Config } from './Config.js'
import { mimeFor } from './utils/mime.js'
import * as mockBrokerCollection from './mockBrokersCollection.js'
import { JsonBodyParserError } from './utils/http-request.js'
import { sendInternalServerError, sendNotFound, sendFile, sendBadRequest } from './utils/http-response.js'


export async function dispatchMock(req, response) {
	/* Serve Documentation */
	if (req.method === 'GET' && req.url.endsWith('.md')) {
		sendFile(response, join(Config.mocksDir, decodeURIComponent(req.url)))
		return
	}

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
		console.log('\n', req.url, '→\n ', file)

		let mockText
		if (file.endsWith('.js')) {
			response.setHeader('Content-Type', mimeFor('.json'))
			mockText = await jsMockText(file, req, response)
		}
		else {
			response.setHeader('Content-Type', mimeFor(file))
			mockText = broker.isTemp500 ? '' : readMock(file)
		}
		
		if (cookie.getCurrent())
			response.setHeader('Set-Cookie', cookie.getCurrent())

		response.writeHead(status, Config.extraHeaders)
		setTimeout(() => response.end(mockText), delay)
	}
	catch (error) {
		console.error(error)
		if (error instanceof JsonBodyParserError)
			sendBadRequest(response)
		else if (error.code === 'ENOENT')
			sendNotFound(response) // file has been deleted
		else
			sendInternalServerError(response)
	}
}

async function jsMockText(file, req, response) {
	const jsExport = await importDefault(file)
	return typeof jsExport === 'function'
		? await jsExport(req, response)
		: JSON.stringify(jsExport, null, 2)
}

function readMock(file) {
	return readFileSync(join(Config.mocksDir, file), 'utf8')
}

async function importDefault(file) {
	// The date param is just for cache busting
	return (await import(join(Config.mocksDir, file) + '?' + Date.now())).default
}
