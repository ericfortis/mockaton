import { createServer } from 'node:http'

import { API } from './ApiConstants.js'
import { Config, setup } from './Config.js'
import { dispatchMock } from './MockDispatcher.js'
import * as mockBrokerCollection from './mockBrokersCollection.js'
import { dispatchStatic, isStatic } from './StaticDispatcher.js'
import { apiPatchRequests, apiGetRequests } from './Api.js'


export function Mockaton(options) {
	setup(options)
	mockBrokerCollection.init()
	const server = createServer(onRequest)
	server.listen(Config.port, Config.host, (error) => {
		const { address, port } = server.address()
		const url = `http://${address}:${port}`
		console.log('Listening', url)
		console.log('Dashboard', url + API.dashboard)
		if (error)
			console.error(error)
		else
			Config.onReady(url + API.dashboard)
	})
	return server
}

async function onRequest(req, response) {
	response.setHeader('Server', 'Mockaton')

	const { url, method } = req
	if (method === 'GET' && apiGetRequests.has(url))
		apiGetRequests.get(url)(req, response)

	else if (method === 'PATCH' && apiPatchRequests.has(url))
		await apiPatchRequests.get(url)(req, response)

	else if (isStatic(req))
		await dispatchStatic(req, response)

	else
		await dispatchMock(req, response)
}
