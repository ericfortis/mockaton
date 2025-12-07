import { createServer } from 'node:http'

import pkgJSON from '../../package.json' with { type: 'json' }

import { logger } from './utils/logger.js'
import { ServerResponse } from './utils/ServerResponse.js'
import { IncomingMessage } from './utils/IncomingMessage.js'
import { setCorsHeaders, isPreflight } from './utils/http-cors.js'
import { BodyReaderError, hasControlChars } from './utils/IncomingMessage.js'

import { API } from './ApiConstants.js'
import { config, setup } from './config.js'
import { apiPatchReqs, apiGetReqs } from './Api.js'

import { dispatchMock } from './MockDispatcher.js'
import { dispatchStatic } from './StaticDispatcher.js'

import * as staticCollection from './staticCollection.js'
import * as mockBrokerCollection from './mockBrokersCollection.js'

import { watchDevSPA } from './WatcherDevClient.js'
import { watchMocksDir, watchStaticDir } from './Watcher.js'


export function Mockaton(options) {
	return new Promise((resolve, reject) => {
		setup(options)

		mockBrokerCollection.init()
		staticCollection.init()

		if (config.watcherEnabled) {
			watchMocksDir()
			watchStaticDir()
		}
		if (config.hotReload)
			watchDevSPA()

		const server = createServer({ IncomingMessage, ServerResponse }, onRequest)
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

	response.setHeader('Server', `Mockaton ${pkgJSON.version}`)
	response.setHeaderList(config.extraHeaders)

	const url = req.url || ''

	if (url.length > 2048) {
		response.sendTooLongURI()
		return
	}
	if (hasControlChars(url)) {
		response.sendBadRequest()
		return
	}

	try {
		if (config.corsAllowed)
			setCorsHeaders(req, response, config)

		const { method } = req
		const { pathname } = new URL(url, 'http://_')

		if (isPreflight(req))
			response.sendNoContent()

		else if (method === 'PATCH' && apiPatchReqs.has(pathname))
			await apiPatchReqs.get(pathname)(req, response)

		else if (method === 'GET' && apiGetReqs.has(pathname))
			apiGetReqs.get(pathname)(req, response)

		else if (method === 'GET' && staticCollection.brokerByRoute(pathname))
			await dispatchStatic(req, response)

		else
			await dispatchMock(req, response)
	}
	catch (error) {
		if (error instanceof BodyReaderError)
			response.sendUnprocessable(`${error.name}: ${error.message}`)
		else
			response.sendInternalServerError(error)
	}
}
