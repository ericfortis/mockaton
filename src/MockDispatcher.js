import { join } from 'node:path'

import { proxy } from './ProxyRelay.js'
import { cookie } from './cookie.js'
import { config } from './config.js'
import { applyPlugins } from './MockDispatcherPlugins.js'
import { BodyReaderError } from './utils/http-request.js'
import * as mockBrokerCollection from './mockBrokersCollection.js'
import { sendInternalServerError, sendNotFound, sendUnprocessableContent } from './utils/http-response.js'


export async function dispatchMock(req, response) {
	try {
		const broker = mockBrokerCollection.getBrokerByRoute(req.method, req.url)
		if (!broker || broker.proxied) {
			if (config.proxyFallback)
				await proxy(req, response, config.delay * Boolean(broker?.delayed))
			else
				sendNotFound(response)
			return
		}

		console.log('%s → %s', decodeURIComponent(req.url), broker.file)
		response.statusCode = broker.status

		if (cookie.getCurrent())
			response.setHeader('Set-Cookie', cookie.getCurrent())

		for (let i = 0; i < config.extraHeaders.length; i += 2)
			response.setHeader(config.extraHeaders[i], config.extraHeaders[i + 1])

		const { mime, body } = broker.temp500IsSelected
			? { mime: '', body: '' }
			: await applyPlugins(join(config.mocksDir, broker.file), req, response)

		response.setHeader('Content-Type', mime)
		setTimeout(() => response.end(body), config.delay * broker.delayed)
	}
	catch (error) {
		if (error instanceof BodyReaderError)
			sendUnprocessableContent(response, error.name)
		else if (error.code === 'ENOENT') // mock-file has been deleted
			sendNotFound(response)
		else if (error.code === 'ERR_UNKNOWN_FILE_EXTENSION') {
			if (error.toString().includes('Unknown file extension ".ts'))
				console.error('\nLooks like you need a TypeScript compiler\n')
			sendInternalServerError(response, error)
		}
		else
			sendInternalServerError(response, error)
	}
}
