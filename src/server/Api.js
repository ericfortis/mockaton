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
	[API.toggle500, toggleRoute500],
	
	[API.delayStatic, setStaticRouteIsDelayed],
	[API.staticStatus, setStaticRouteStatusCode]
])


/** # GET */

function serveDashboard(_, response) {
	response.sendHTML(IndexHtml(config.hotReload), CSP)
}

function serveStatic(f) {
	return (_, response) => {
		response.sendFile(join(CLIENT_DIR, f))
	}
}

function getState(_, response) {
	response.sendJSON({
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
	response.sendOK()
}


async function setCorsAllowed(req, response) {
	const corsAllowed = await req.json()

	if (!ConfigValidator.corsAllowed(corsAllowed))
		response.sendUnprocessable(`Expected boolean for "corsAllowed"`)
	else {
		config.corsAllowed = corsAllowed
		response.sendOK()
	}
}


async function setGlobalDelay(req, response) {
	const delay = await req.json()

	if (!ConfigValidator.delay(delay))
		response.sendUnprocessable(`Expected non-negative integer for "delay"`)
	else {
		config.delay = delay
		response.sendOK()
	}
}


async function selectCookie(req, response) {
	const cookieKey = await req.json()

	const error = cookie.setCurrent(cookieKey)
	if (error)
		response.sendUnprocessable(error?.message || error)
	else
		response.sendJSON(cookie.list())
}


async function setProxyFallback(req, response) {
	const fallback = await req.json()

	if (!ConfigValidator.proxyFallback(fallback))
		response.sendUnprocessable(`Invalid Proxy Fallback URL`)
	else {
		config.proxyFallback = fallback
		response.sendOK()
	}
}

async function setCollectProxied(req, response) {
	const collectProxied = await req.json()

	if (!ConfigValidator.collectProxied(collectProxied))
		response.sendUnprocessable(`Expected a boolean for "collectProxied"`)
	else {
		config.collectProxied = collectProxied
		response.sendOK()
	}
}



async function bulkUpdateBrokersByCommentTag(req, response) {
	const comment = await req.json()

	mockBrokersCollection.setMocksMatchingComment(comment)
	response.sendOK()
}


async function selectMock(req, response) {
	const file = await req.json()

	const broker = mockBrokersCollection.brokerByFilename(file)
	if (!broker || !broker.hasMock(file))
		response.sendUnprocessable(`Missing Mock: ${file}`)
	else {
		broker.selectFile(file)
		response.sendJSON(broker)
	}
}


async function toggleRoute500(req, response) {
	const [method, urlMask] = await req.json()

	const broker = mockBrokersCollection.brokerByRoute(method, urlMask)
	if (!broker)
		response.sendUnprocessable(`Route does not exist: ${method} ${urlMask}`)
	else {
		broker.toggle500()
		response.sendJSON(broker)
	}
}


async function setRouteIsDelayed(req, response) {
	const [method, urlMask, delayed] = await req.json()

	const broker = mockBrokersCollection.brokerByRoute(method, urlMask)
	if (!broker)
		response.sendUnprocessable(`Route does not exist: ${method} ${urlMask}`)
	else if (typeof delayed !== 'boolean')
		response.sendUnprocessable(`Expected boolean for "delayed"`)
	else {
		broker.setDelayed(delayed)
		response.sendJSON(broker)
	}
}


async function setRouteIsProxied(req, response) {
	const [method, urlMask, proxied] = await req.json()

	const broker = mockBrokersCollection.brokerByRoute(method, urlMask)
	if (!broker)
		response.sendUnprocessable( `Route does not exist: ${method} ${urlMask}`)
	else if (typeof proxied !== 'boolean')
		response.sendUnprocessable(`Expected boolean for "proxied"`)
	else if (proxied && !config.proxyFallback)
		response.sendUnprocessable(`There’s no proxy fallback`)
	else {
		broker.setProxied(proxied)
		response.sendJSON(broker)
	}
}



async function setStaticRouteStatusCode(req, response) {
	const [route, status] = await req.json()

	const broker = staticCollection.brokerByRoute(route)
	if (!broker)
		response.sendUnprocessable(`Static route does not exist: ${route}`)
	else if (!(status === 200 || status === 404))
		response.sendUnprocessable(`Expected 200 or 404 status code`)
	else {
		broker.setStatus(status)
		response.sendOK()
	}
}


async function setStaticRouteIsDelayed(req, response) {
	const [route, delayed] = await req.json()

	const broker = staticCollection.brokerByRoute(route)
	if (!broker)
		response.sendUnprocessable(`Static route does not exist: ${route}`)
	else if (typeof delayed !== 'boolean')
		response.sendUnprocessable(`Expected boolean for "delayed"`)
	else {
		broker.setDelayed(delayed)
		response.sendOK()
	}
}
