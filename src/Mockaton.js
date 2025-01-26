import { join } from 'node:path'
import { createServer } from 'node:http'
import { watch, existsSync } from 'node:fs'

import { API } from './ApiConstants.js'
import { dispatchMock } from './MockDispatcher.js'
import { config, setup } from './config.js'
import { sendNoContent } from './utils/http-response.js'
import * as mockBrokerCollection from './mockBrokersCollection.js'
import { dispatchStatic, isStatic } from './StaticDispatcher.js'
import { setCorsHeaders, isPreflight } from './utils/http-cors.js'
import { apiPatchRequests, apiGetRequests } from './Api.js'


export function Mockaton(options) {
	setup(options)
	mockBrokerCollection.init()

	watch(config.mocksDir, { recursive: true, persistent: false }, (_, filename) => {
		if (existsSync(join(config.mocksDir, filename)))
			mockBrokerCollection.registerMock(filename, 'ensureItHas500')
		else
			mockBrokerCollection.unregisterMock(filename)
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
