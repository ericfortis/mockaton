import { createServer } from 'node:http'

import { log } from './utils/log.js'
import { API } from './ApiConstants.js'
import { config, setup } from './config.js'
import { dispatchMock } from './MockDispatcher.js'
import { dispatchStatic } from './StaticDispatcher.js'
import * as staticCollection from './staticCollection.js'
import { BodyReaderError } from './utils/http-request.js'
import * as mockBrokerCollection from './mockBrokersCollection.js'
import { setCorsHeaders, isPreflight } from './utils/http-cors.js'
import { watchMocksDir, watchStaticDir } from './Watcher.js'
import { apiPatchRequests, apiGetRequests } from './Api.js'
import { sendNoContent, sendInternalServerError, sendUnprocessableContent } from './utils/http-response.js'


process.on('unhandledRejection', error => { throw error })

export function Mockaton(options) {
	const error = setup(options)
	if (error) {
		log.error(error)
		process.exitCode = 1
		return
	}

	mockBrokerCollection.init()
	staticCollection.init()
	watchMocksDir()
	watchStaticDir()

	const server = createServer(onRequest)

	server.listen(config.port, config.host, function (error) {
		if (error) {
			log.error(error)
			process.exit(1)
			return
		}
		const { address, port } = this.address()
		const url = `http://${address}:${port}`
		log.info('Listening', url)
		log.info('Dashboard', url + API.dashboard)
		config.onReady(url + API.dashboard)
	})

	server.on('error', error => {
		log.error(error.message)
		process.exit(1)
	})

	return server
}


async function onRequest(req, response) {
	response.on('error', log.warn)

	try {
		response.setHeader('Server', 'Mockaton')

		if (config.corsAllowed)
			setCorsHeaders(req, response, config)

		const { url, method } = req

		if (isPreflight(req))
			sendNoContent(response)

		else if (method === 'PATCH' && apiPatchRequests.has(url))
			await apiPatchRequests.get(url)(req, response)

		else if (method === 'GET' && apiGetRequests.has(url))
			apiGetRequests.get(url)(req, response)

		else if (method === 'GET' && staticCollection.brokerByRoute(url))
			await dispatchStatic(req, response)

		else
			await dispatchMock(req, response)
	}
	catch (error) {
		if (error instanceof BodyReaderError)
			sendUnprocessableContent(response, `${error.name}: ${error.message}`)
		else
			sendInternalServerError(response, error)
	}
}
