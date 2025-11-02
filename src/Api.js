/**
 * API for controlling Mockaton. For example, for
 * selecting a specific mock-file for a particular route.
 */

import { join } from 'node:path'

import { cookie } from './cookie.js'
import { parseJSON } from './utils/http-request.js'
import { uiSyncVersion } from './Watcher.js'
import * as staticCollection from './staticCollection.js'
import * as mockBrokersCollection from './mockBrokersCollection.js'
import { config, ConfigValidator } from './config.js'
import { DashboardHtml, CSP } from './DashboardHtml.js'
import { sendOK, sendJSON, sendUnprocessableContent, sendFile, sendHTML } from './utils/http-response.js'
import { API, LONG_POLL_SERVER_TIMEOUT, HEADER_SYNC_VERSION } from './ApiConstants.js'


export const apiGetRequests = new Map([
	[API.dashboard, serveDashboard],
	...[
		'Logo.svg',
		'Dashboard.css',
		'ApiCommander.js',
		'ApiConstants.js',
		'Dashboard.js',
		'DashboardDom.js',
		'DashboardStore.js',
		'Filename.js'
	].map(f => [API.dashboard + '/' + f, serveStatic(f)]),

	[API.state, getState],
	[API.syncVersion, longPollClientSyncVersion],
	[API.throws, () => { throw new Error('Test500') }]
])

export const apiPatchRequests = new Map([
	[API.cors, setCorsAllowed],
	[API.delay, setRouteIsDelayed],
	[API.reset, reinitialize],
	[API.select, selectMock],
	[API.proxied, setRouteIsProxied],
	[API.cookies, selectCookie],
	[API.fallback, updateProxyFallback],
	[API.toggle500, toggle500],
	[API.bulkSelect, bulkUpdateBrokersByCommentTag],
	[API.globalDelay, setGlobalDelay],
	[API.collectProxied, setCollectProxied],
	[API.delayStatic, setStaticRouteIsDelayed],
	[API.staticStatus, setStaticRouteStatusCode]
])


/** # GET */

function serveDashboard(_, response) {
	sendHTML(response, DashboardHtml, CSP)
}

function serveStatic(f) {
	return (_, response) => sendFile(response, join(import.meta.dirname, f))
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


function longPollClientSyncVersion(req, response) {
	const clientVersion = req.headers[HEADER_SYNC_VERSION]
	if (clientVersion !== undefined && uiSyncVersion.version !== Number(clientVersion)) {
		// e.g., tab was hidden while new mocks were added or removed
		sendJSON(response, uiSyncVersion.version)
		return
	}

	function onAddOrRemoveMock() {
		uiSyncVersion.unsubscribe(onAddOrRemoveMock)
		sendJSON(response, uiSyncVersion.version)
	}
	response.setTimeout(LONG_POLL_SERVER_TIMEOUT, onAddOrRemoveMock)
	req.on('error', () => {
		uiSyncVersion.unsubscribe(onAddOrRemoveMock)
		response.destroy()
	})
	uiSyncVersion.subscribe(onAddOrRemoveMock)
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
		sendUnprocessableContent(response, error?.message || error)
	else
		sendJSON(response, cookie.list())
}


async function selectMock(req, response) {
	const file = await parseJSON(req)

	const broker = mockBrokersCollection.brokerByFilename(file)
	if (!broker || !broker.hasMock(file))
		sendUnprocessableContent(response, `Missing Mock: ${file}`)
	else {
		broker.selectFile(file)
		sendJSON(response, broker)
	}
}


async function toggle500(req, response) {
	const [method, urlMask] = await parseJSON(req)

	const broker = mockBrokersCollection.brokerByRoute(method, urlMask)
	if (!broker)
		sendUnprocessableContent(response, `Route does not exist: ${method} ${urlMask}`)
	else {
		broker.toggle500()
		sendJSON(response, broker)
	}
}


async function setRouteIsDelayed(req, response) {
	const [method, urlMask, delayed] = await parseJSON(req)

	const broker = mockBrokersCollection.brokerByRoute(method, urlMask)
	if (!broker)
		sendUnprocessableContent(response, `Route does not exist: ${method} ${urlMask}`)
	else if (typeof delayed !== 'boolean')
		sendUnprocessableContent(response, `Expected boolean for "delayed"`)
	else {
		broker.setDelayed(delayed)
		sendJSON(response, broker)
	}
}


async function setRouteIsProxied(req, response) {
	const [method, urlMask, proxied] = await parseJSON(req)

	const broker = mockBrokersCollection.brokerByRoute(method, urlMask)
	if (!broker)
		sendUnprocessableContent(response, `Route does not exist: ${method} ${urlMask}`)
	else if (typeof proxied !== 'boolean')
		sendUnprocessableContent(response, `Expected boolean for "proxied"`)
	else if (proxied && !config.proxyFallback)
		sendUnprocessableContent(response, `There’s no proxy fallback`)
	else {
		broker.setProxied(proxied)
		sendJSON(response, broker)
	}
}


async function updateProxyFallback(req, response) {
	const fallback = await parseJSON(req)

	if (!ConfigValidator.proxyFallback(fallback))
		sendUnprocessableContent(response, `Invalid Proxy Fallback URL`)
	else {
		config.proxyFallback = fallback
		sendOK(response)
	}
}


async function setCollectProxied(req, response) {
	const collectProxied = await parseJSON(req)

	if (!ConfigValidator.collectProxied(collectProxied))
		sendUnprocessableContent(response, `Expected a boolean for "collectProxied"`)
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
		sendUnprocessableContent(response, `Expected boolean for "corsAllowed"`)
	else {
		config.corsAllowed = corsAllowed
		sendOK(response)
	}
}


async function setGlobalDelay(req, response) {
	const delay = await parseJSON(req)

	if (!ConfigValidator.delay(delay))
		sendUnprocessableContent(response, `Expected non-negative integer for "delay"`)
	else {
		config.delay = delay
		sendOK(response)
	}
}



async function setStaticRouteStatusCode(req, response) {
	const [urlMask, status] = await parseJSON(req)

	const broker = staticCollection.brokerByRoute(urlMask)
	if (!broker)
		sendUnprocessableContent(response, `Static route does not exist: ${urlMask}`)
	else if (!(status === 200 || status === 404))
		sendUnprocessableContent(response, `Expected 200 or 404 status code`)
	else {
		broker.setStatus(status)
		sendOK(response)
	}
}


async function setStaticRouteIsDelayed(req, response) {
	const [urlMask, delayed] = await parseJSON(req)

	const broker = staticCollection.brokerByRoute(urlMask)
	if (!broker)
		sendUnprocessableContent(response, `Static route does not exist: ${urlMask}`)
	else if (typeof delayed !== 'boolean')
		sendUnprocessableContent(response, `Expected boolean for "delayed"`)
	else {
		broker.setDelayed(delayed)
		sendOK(response)
	}
}

