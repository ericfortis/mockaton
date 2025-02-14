import { join } from 'node:path'
import { createServer } from 'node:http'
import { watch, existsSync } from 'node:fs'

import { API } from './ApiConstants.js'
import { dispatchMock } from './MockDispatcher.js'
import { config, setup } from './config.js'
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

	watch(config.mocksDir, { recursive: true, persistent: false },
		function handleAddedOrDeletedMocks(_, file) {
			if (!file)
				return
			if (existsSync(join(config.mocksDir, file)))
				mockBrokerCollection.registerMock(file, 'isFromWatcher')
			else
				mockBrokerCollection.unregisterMock(file)
		})

	return createServer(onRequest).listen(config.port, config.host, function (error) {
		const { address, port } = this.address()
		const url = `http://${address}:${port}`
		console.log('Listening', url)
		console.log('Dashboard', url + API.dashboard)
		if (error)
			console.error(error)
		else
			config.onReady(url + API.dashboard)
	})
}

async function onRequest(req, response) {
	req.on('error', console.error)
	response.on('error', console.error)

	try {
		response.setHeader('Server', 'Mockaton')

		if (config.corsAllowed)
			setCorsHeaders(req, response, {
				origins: config.corsOrigins,
				headers: config.corsHeaders,
				methods: config.corsMethods,
				maxAge: config.corsMaxAge,
				credentials: config.corsCredentials,
				exposedHeaders: config.corsExposedHeaders
			})

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
			sendUnprocessableContent(response, error)
		else
			sendInternalServerError(response, error)
	}
}
