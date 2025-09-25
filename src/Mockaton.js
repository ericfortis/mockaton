import { createServer } from 'node:http'

import { logger } from './utils/logger.js'
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


export function Mockaton(options) {
	return new Promise((resolve, reject) => {
		setup(options)

		mockBrokerCollection.init()
		staticCollection.init()
		watchMocksDir()
		watchStaticDir()

		const server = createServer(onRequest)
		server.on('error', reject)
		server.listen(config.port, config.host, () => {
			const { address, port } = server.address()
			const url = `http://${address}:${port}`
			const dashboardUrl = url + API.dashboard
			logger.info('Listening', url)
			logger.info('Dashboard', dashboardUrl)
			config.onReady(dashboardUrl)
			resolve(server)
		})
	})
}

async function onRequest(req, response) {
	response.on('error', logger.warn)

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
