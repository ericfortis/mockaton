import { createServer } from 'node:http'

import { API } from './ApiConstants.js'
import { config, setup } from './config.js'
import { dispatchMock } from './MockDispatcher.js'
import { watchMocksDir } from './Watcher.js'
import { BodyReaderError } from './utils/http-request.js'
import * as mockBrokerCollection from './mockBrokersCollection.js'
import { dispatchStatic, isStatic } from './StaticDispatcher.js'
import { setCorsHeaders, isPreflight } from './utils/http-cors.js'
import { apiPatchRequests, apiGetRequests } from './Api.js'
import { sendNoContent, sendInternalServerError, sendUnprocessableContent } from './utils/http-response.js'


process.on('unhandledRejection', error => { throw error })

export function Mockaton(options) {
	setup(options)
	mockBrokerCollection.init()
	watchMocksDir()

	return createServer(onRequest).listen(config.port, config.host, function (error) {
		if (error) {
			console.error(error)
			return
		}
		const { address, port } = this.address()
		const url = `http://${address}:${port}`
		console.log('Listening', url)
		console.log('Dashboard', url + API.dashboard)
		config.onReady(url + API.dashboard)
	})
}

async function onRequest(req, response) {
	response.on('error', console.error)

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

		else if (method === 'GET' && isStatic(req))
			await dispatchStatic(req, response)

		else
			await dispatchMock(req, response)
	}
	catch (error) {
		if (error instanceof BodyReaderError)
			sendUnprocessableContent(response, error.name)
		else
			sendInternalServerError(response, error)
	}
}
