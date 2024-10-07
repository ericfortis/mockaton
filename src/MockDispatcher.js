import { join } from 'node:path'

import { proxy } from './ProxyRelay.js'
import { cookie } from './cookie.js'
import { Config } from './Config.js'
import { preprocessPlugins } from './MockDispatcherPlugins.js'
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

		console.log(decodeURIComponent(req.url), ' → ', broker.file)
		response.statusCode = broker.status

		if (cookie.getCurrent())
			response.setHeader('Set-Cookie', cookie.getCurrent())

		for (let i = 0; i < Config.extraHeaders.length; i += 2)
			response.setHeader(Config.extraHeaders[i], Config.extraHeaders[i + 1])

		const { mime, body } = broker.isTemp500
			? { mime: '', body: '' }
			: await preprocessPlugins(join(Config.mocksDir, broker.file), req, response)

		response.setHeader('Content-Type', mime)
		setTimeout(() => response.end(body), broker.delay)
	}
	catch (error) {
		if (error instanceof JsonBodyParserError)
			sendBadRequest(response, error)
		else if (error.code === 'ENOENT') // mock-file has been deleted
			sendNotFound(response)
		else if (error.code === 'ERR_UNKNOWN_FILE_EXTENSION') {
			if (error.toString().includes('Unknown file extension ".ts'))
				console.error('Looks like you need a TypeScript compiler')
			sendInternalServerError(response, error)
		}
		else
			sendInternalServerError(response, error)
	}
}
