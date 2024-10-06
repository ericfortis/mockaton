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
	try {
		const broker = mockBrokerCollection.getBrokerForUrl(req.method, req.url)
		if (!broker) {
			if (Config.proxyFallback)
				await proxy(req, response)
			else
				sendNotFound(response)
			return
		}

		const { file, status, delay } = broker
		console.log(decodeURIComponent(req.url), ' → ', file)
		const filePath = join(Config.mocksDir, file)

		response.statusCode = status

		if (cookie.getCurrent())
			response.setHeader('Set-Cookie', cookie.getCurrent())

		for (let i = 0; i < Config.extraHeaders.length; i += 2)
			response.setHeader(Config.extraHeaders[i], Config.extraHeaders[i + 1])

		const [mime, mockBody] = broker.isTemp500
			? temp500Plugin(filePath, req, response)
			: await preprocessPlugins(filePath, req, response)

		response.setHeader('Content-Type', mime)
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

// TODO expose to userland for custom plugins such yaml -> json
async function preprocessPlugins(filePath, req, response) {
	if (filePath.endsWith('.js') || filePath.endsWith('.ts'))
		return await jsPlugin(filePath, req, response)
	return readPlugin(filePath, req, response)
}

function temp500Plugin(filePath) {
	return [mimeFor(filePath), '']
}

async function jsPlugin(filePath, req, response) {
	const jsExport = (await import(filePath + '?' + Date.now())).default // date for cache busting
	const mockBody = typeof jsExport === 'function'
		? await jsExport(req, response)
		: JSON.stringify(jsExport, null, 2)
	const mime = response.getHeader('Content-Type') // jsFunc are allowed to set it
		|| mimeFor('.json')
	return [mime, mockBody]
}

function readPlugin(filePath) {
	return [mimeFor(filePath), read(filePath)]
}
