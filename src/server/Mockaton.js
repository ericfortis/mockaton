import { register } from 'node:module'
import { createServer } from 'node:http'

import pkgJSON from '../../package.json' with { type: 'json' }

import { logger } from './utils/logger.js'
import { ServerResponse } from './utils/HttpServerResponse.js'
import { setCorsHeaders, isPreflight } from './utils/http-cors.js'
import { IncomingMessage, BodyReaderError, hasControlChars } from './utils/HttpIncomingMessage.js'

import { API } from '../client/ApiConstants.js'

import { cookie } from './cookie.js'
import { config, setup } from './config.js'
import { apiPatchReqs, apiGetReqs } from './Api.js'

import { dispatchMock } from './MockDispatcher.js'

import * as mockBrokerCollection from './mockBrokersCollection.js'

import { watchDevSPA } from './WatcherDevClient.js'
import { watchMocksDir } from './Watcher.js'


export function Mockaton(options) {
	return new Promise((resolve, reject) => {
		setup(options)
		cookie.init(config.cookies)
		mockBrokerCollection.init()

		if (config.watcherEnabled) {
			register('./cacheBustResolver.js', import.meta.url)
			watchMocksDir()
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
	response.on('finish', () => {
		const f = response.getHeader('Mockaton-File')
		if (f)
			logger.normal('MOCK', req.url, f)
		else
			logger.verbose('API', response)
	})

	response.setHeader('Server', `Mockaton ${pkgJSON.version}`)
	response.setHeaderList(config.extraHeaders)

	const url = req.url || ''

	if (url.length > 2048) {
		response.uriTooLong()
		return
	}
	if (hasControlChars(url)) {
		response.badRequest()
		return
	}

	try {
		if (config.corsAllowed)
			setCorsHeaders(req, response, config)

		const { method } = req
		const { pathname } = new URL(url, 'http://_')

		if (isPreflight(req))
			response.noContent()

		else if (method === 'PATCH' && apiPatchReqs.has(pathname))
			await apiPatchReqs.get(pathname)(req, response)

		else if (method === 'GET' && apiGetReqs.has(pathname))
			apiGetReqs.get(pathname)(req, response)

		else
			await dispatchMock(req, response)
	}
	catch (error) {
		if (error instanceof BodyReaderError)
			response.unprocessable(`${error.name}: ${error.message}`)
		else {
			logger.error(500, req.url, error?.message || error, error?.stack || '')
			response.internalServerError(error)
		}
	}
}
