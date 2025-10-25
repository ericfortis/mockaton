import { createServer } from 'node:http'

import { logger } from './utils/logger.js'
import { API } from './ApiConstants.js'
import { config, setup } from './config.js'
import { dispatchMock } from './MockDispatcher.js'
import { dispatchStatic } from './StaticDispatcher.js'
import * as staticCollection from './staticCollection.js'
import * as mockBrokerCollection from './mockBrokersCollection.js'
import { setCorsHeaders, isPreflight } from './utils/http-cors.js'
import { watchMocksDir, watchStaticDir } from './Watcher.js'
import { apiPatchRequests, apiGetRequests } from './Api.js'
import { BodyReaderError, hasControlChars } from './utils/http-request.js'
import { sendNoContent, sendInternalServerError, sendUnprocessableContent, sendTooLongURI, sendBadRequest } from './utils/http-response.js'


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
			const url = `http://${server.address().address}:${server.address().port}`
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
	response.setHeader('Server', 'Mockaton')

	const url = req.url || ''

	if (url.length > 2048) {
		sendTooLongURI(response)
		return
	}
	if (hasControlChars(url)) {
		sendBadRequest(response)
		return
	}

	try {
		if (config.corsAllowed)
			setCorsHeaders(req, response, config)

		const { method } = req
		const { pathname } = new URL(url, 'http://_')

		if (isPreflight(req))
			sendNoContent(response)

		else if (method === 'PATCH' && apiPatchRequests.has(pathname))
			await apiPatchRequests.get(pathname)(req, response)

		else if (method === 'GET' && apiGetRequests.has(pathname))
			apiGetRequests.get(pathname)(req, response)

		else if (method === 'GET' && staticCollection.brokerByRoute(pathname))
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
