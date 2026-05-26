import { register } from 'node:module'
import { createServer } from 'node:http'

import pkgJSON from '../../package.json' with { type: 'json' }

import { logger } from './utils/logger.js'
import { ServerResponse } from './utils/HttpServerResponse.js'
import { setCorsHeaders, isPreflight } from './utils/http-cors.js'
import { IncomingMessage, BodyReaderError, hasControlChars } from './utils/HttpIncomingMessage.js'
import { watchDevSPA } from './utils/WatcherDevClient.js'

import { API } from '../client/ApiConstants.js'

import { CLIENT_ASSETS, handleApiRequest } from './Api.js'
import { cookie } from './cookie.js'
import { config, setup } from './config.js'
import * as mockBrokerCollection from './mockBrokersCollection.js'
import { dispatchMock } from './MockDispatcher.js'
import { watchMocksDir } from './Watcher.js'


export function Mockaton(options) {
	return new Promise((resolve, reject) => {
		setup(options)
		cookie.init(config.cookies)
		mockBrokerCollection.init()

		register('./ResolverResolveExtensionless.js', import.meta.url)

		if (config.bypassImportCache)
			register('./ResolverBypassImportCache.js', import.meta.url)

		if (config.watcherEnabled)
			watchMocksDir()

		if (config.hotReload)
			watchDevSPA(CLIENT_ASSETS)

		const server = createServer({ IncomingMessage, ServerResponse }, onRequest)
		server.on('error', reject)
		server.listen(config.port, config.host, () => {
			const url = `http://${server.address().address}:${server.address().port}`
			const dashboardUrl = url + API.root
			logger.info('Listening', url)
			logger.info('Dashboard', dashboardUrl)
			config.onReady(dashboardUrl)
			resolve(server)
		})
	})
}


async function onRequest(req, response) {
	response.setHeader('Server', `Mockaton ${pkgJSON.version}`)
	response.on('error', logger.warn)

	let handledByMockDispatcher = false
	response.on('finish', () => {
		if (!handledByMockDispatcher)
			logger.verbose('APP', response)
	})

	const url = req.url || ''

	if (url.length > 2048) {
		response.uriTooLong()
		return
	}
	if (hasControlChars(url)) {
		response.badRequest()
		return
	}

	if (config.corsAllowed)
		setCorsHeaders(req, response, config)

	try {
		if (isPreflight(req))
			response.noContent()
		else if (!(await handleApiRequest(req, response))) {
			handledByMockDispatcher = true
			await dispatchMock(req, response)
		}
	}
	catch (error) {
		if (error instanceof BodyReaderError)
			response.unprocessable(`${error.name}: ${error.message}`)
		else {
			logger.error(500, req.url, error?.message || error, error?.stack || '')
			response.internalServerError()
		}
	}
}
