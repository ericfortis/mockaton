/**
 * API for controlling Mockaton. For example, for
 * selecting a specific mock-file for a particular route.
 */

import { join } from 'node:path'

import {
	longPollDevClientHotReload,
	DASHBOARD_ASSETS,
	CLIENT_DIR
} from './WatcherDevClient.js'
import { longPollClientSyncVersion } from './Watcher.js'

import { IndexHtml, CSP } from '../client/indexHtml.js'

import { API } from './ApiConstants.js'
import { cookie } from './cookie.js'
import { config, ConfigValidator } from './config.js'

import * as staticCollection from './staticCollection.js'
import * as mockBrokersCollection from './mockBrokersCollection.js'

import { parseJSON } from './utils/http-request.js'
import { sendOK, sendJSON, sendUnprocessable, sendFile, sendHTML } from './utils/http-response.js'


export const apiGetReqs = new Map([
	[API.dashboard, serveDashboard],
	...DASHBOARD_ASSETS.map(f => [API.dashboard + '/' + f, serveStatic(f)]),

	[API.state, getState],
	[API.syncVersion, longPollClientSyncVersion],
	
	[API.watchHotReload, longPollDevClientHotReload],
	[API.throws, () => { throw new Error('Test500') }]
])


export const apiPatchReqs = new Map([
	[API.cors, setCorsAllowed],
	[API.reset, reinitialize],
	[API.cookies, selectCookie],
	[API.globalDelay, setGlobalDelay],
	
	[API.fallback, setProxyFallback],
	[API.collectProxied, setCollectProxied],
	
	[API.bulkSelect, bulkUpdateBrokersByCommentTag],

	[API.delay, setRouteIsDelayed],
	[API.select, selectMock],
	[API.proxied, setRouteIsProxied],
	[API.toggle500, toggle500],
	
	[API.delayStatic, setStaticRouteIsDelayed],
	[API.staticStatus, setStaticRouteStatusCode]
])


/** # GET */

function serveDashboard(_, response) {
	sendHTML(response, IndexHtml(config.hotReload), CSP)
}

function serveStatic(f) {
	return (_, response) => {
		sendFile(response, join(CLIENT_DIR, f))
	}
}

function getState(_, response) {
	sendJSON(response, {
		cookies: cookie.list(),
		comments: mockBrokersCollection.extractAllComments(),

		brokersByMethod: mockBrokersCollection.all(),
		staticBrokers: staticCollection.all(),

		delay: config.delay,
		delayJitter: config.delayJitter,

		proxyFallback: config.proxyFallback,
		collectProxied: config.collectProxied,
		corsAllowed: config.corsAllowed
	})
}


/** # PATCH */

function reinitialize(_, response) {
	mockBrokersCollection.init()
	staticCollection.init()
	sendOK(response)
}


async function selectCookie(req, response) {
	const cookieKey = await parseJSON(req)

	const error = cookie.setCurrent(cookieKey)
	if (error)
		sendUnprocessable(response, error?.message || error)
	else
		sendJSON(response, cookie.list())
}


async function selectMock(req, response) {
	const file = await parseJSON(req)

	const broker = mockBrokersCollection.brokerByFilename(file)
	if (!broker || !broker.hasMock(file))
		sendUnprocessable(response, `Missing Mock: ${file}`)
	else {
		broker.selectFile(file)
		sendJSON(response, broker)
	}
}


async function toggle500(req, response) {
	const [method, urlMask] = await parseJSON(req)

	const broker = mockBrokersCollection.brokerByRoute(method, urlMask)
	if (!broker)
		sendUnprocessable(response, `Route does not exist: ${method} ${urlMask}`)
	else {
		broker.toggle500()
		sendJSON(response, broker)
	}
}


async function setRouteIsDelayed(req, response) {
	const [method, urlMask, delayed] = await parseJSON(req)

	const broker = mockBrokersCollection.brokerByRoute(method, urlMask)
	if (!broker)
		sendUnprocessable(response, `Route does not exist: ${method} ${urlMask}`)
	else if (typeof delayed !== 'boolean')
		sendUnprocessable(response, `Expected boolean for "delayed"`)
	else {
		broker.setDelayed(delayed)
		sendJSON(response, broker)
	}
}


async function setRouteIsProxied(req, response) {
	const [method, urlMask, proxied] = await parseJSON(req)

	const broker = mockBrokersCollection.brokerByRoute(method, urlMask)
	if (!broker)
		sendUnprocessable(response, `Route does not exist: ${method} ${urlMask}`)
	else if (typeof proxied !== 'boolean')
		sendUnprocessable(response, `Expected boolean for "proxied"`)
	else if (proxied && !config.proxyFallback)
		sendUnprocessable(response, `There’s no proxy fallback`)
	else {
		broker.setProxied(proxied)
		sendJSON(response, broker)
	}
}


async function setProxyFallback(req, response) {
	const fallback = await parseJSON(req)

	if (!ConfigValidator.proxyFallback(fallback))
		sendUnprocessable(response, `Invalid Proxy Fallback URL`)
	else {
		config.proxyFallback = fallback
		sendOK(response)
	}
}


async function setCollectProxied(req, response) {
	const collectProxied = await parseJSON(req)

	if (!ConfigValidator.collectProxied(collectProxied))
		sendUnprocessable(response, `Expected a boolean for "collectProxied"`)
	else {
		config.collectProxied = collectProxied
		sendOK(response)
	}
}


async function bulkUpdateBrokersByCommentTag(req, response) {
	const comment = await parseJSON(req)

	mockBrokersCollection.setMocksMatchingComment(comment)
	sendOK(response)
}


async function setCorsAllowed(req, response) {
	const corsAllowed = await parseJSON(req)

	if (!ConfigValidator.corsAllowed(corsAllowed))
		sendUnprocessable(response, `Expected boolean for "corsAllowed"`)
	else {
		config.corsAllowed = corsAllowed
		sendOK(response)
	}
}


async function setGlobalDelay(req, response) {
	const delay = await parseJSON(req)

	if (!ConfigValidator.delay(delay))
		sendUnprocessable(response, `Expected non-negative integer for "delay"`)
	else {
		config.delay = delay
		sendOK(response)
	}
}



async function setStaticRouteStatusCode(req, response) {
	const [urlMask, status] = await parseJSON(req)

	const broker = staticCollection.brokerByRoute(urlMask)
	if (!broker)
		sendUnprocessable(response, `Static route does not exist: ${urlMask}`)
	else if (!(status === 200 || status === 404))
		sendUnprocessable(response, `Expected 200 or 404 status code`)
	else {
		broker.setStatus(status)
		sendOK(response)
	}
}


async function setStaticRouteIsDelayed(req, response) {
	const [urlMask, delayed] = await parseJSON(req)

	const broker = staticCollection.brokerByRoute(urlMask)
	if (!broker)
		sendUnprocessable(response, `Static route does not exist: ${urlMask}`)
	else if (typeof delayed !== 'boolean')
		sendUnprocessable(response, `Expected boolean for "delayed"`)
	else {
		broker.setDelayed(delayed)
		sendOK(response)
	}
}
