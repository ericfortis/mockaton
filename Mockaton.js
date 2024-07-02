import { exec } from 'node:child_process'
import { createServer } from 'node:http'

import { DP } from './ApiConstants.js'
import { Config, setup } from './Config.js'
import { dispatchMock } from './MockDispatcher.js'
import * as MockBrokerCollection from './mockBrokersCollection.js'
import { dispatchStatic, isStatic } from './StaticDispatcher.js'
import { apiPatchRequests, apiGetRequests } from './Api.js'


export function Mockaton(options) {
	setup(options)
	MockBrokerCollection.init()

	return createServer(async (req, response) => {
		const { url, method } = req
		if (method === 'GET' && apiGetRequests.has(url))
			apiGetRequests.get(url)(req, response)

		else if (method === 'PATCH' && apiPatchRequests.has(url))
			await apiPatchRequests.get(url)(req, response)

		else if (isStatic(req))
			await dispatchStatic(req, response)

		else
			await dispatchMock(req, response)
	})
		.listen(Config.port, Config.host, function (error) {
			const { address, port } = this.address()
			const url = `http://${address}:${port}`
			console.log('Listening on', url)
			if (error)
				console.error(error)
			else if (!Config.skipOpen)
				exec(`open ${url + DP.dashboard}`)
		})
}
