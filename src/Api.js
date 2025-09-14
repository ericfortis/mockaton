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
import { DF, API, LONG_POLL_SERVER_TIMEOUT } from './ApiConstants.js'
import { sendOK, sendJSON, sendUnprocessableContent, sendFile } from './utils/http-response.js'


export const apiGetRequests = new Map([
	[API.dashboard, serveDashboardAsset('Dashboard.html')],
	...[
		'/ApiConstants.js',
		'/ApiCommander.js',
		'/Dashboard.css',
		'/Dashboard.js',
		'/Filename.js',
		'/Logo.svg'
	].map(f => [API.dashboard + f, serveDashboardAsset(f)]),

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
	[API.bulkSelect, bulkUpdateBrokersByCommentTag],
	[API.globalDelay, setGlobalDelay],
	[API.collectProxied, setCollectProxied],
	[API.delayStatic, setStaticRouteIsDelayed],
	[API.staticStatus, setStaticRouteStatusCode]
])


/** # GET */

function serveDashboardAsset(f) {
	return (_, response) => {
		if (f.endsWith('.html'))
			response.setHeader('Content-Security-Policy', `default-src 'self'; img-src data: blob: 'self'`)
		sendFile(response, join(import.meta.dirname, f))
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

function longPollClientSyncVersion(req, response) {
	if (uiSyncVersion.version !== Number(req.headers[DF.syncVersion])) {
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
	const error = cookie.setCurrent(await parseJSON(req))
	if (error)
		sendUnprocessableContent(response, error)
	else
		sendOK(response)
}

async function selectMock(req, response) {
	const file = await parseJSON(req)
	const broker = mockBrokersCollection.brokerByFilename(file)
	if (!broker || !broker.hasMock(file))
		sendUnprocessableContent(response, `Missing Mock: ${file}`)
	else {
		broker.selectFile(file)
		sendOK(response)
	}
}

async function setRouteIsDelayed(req, response) {
	const body = await parseJSON(req)
	const delayed = body[DF.delayed]
	const broker = mockBrokersCollection.brokerByRoute(
		body[DF.routeMethod],
		body[DF.routeUrlMask])

	if (!broker)
		sendUnprocessableContent(response, `Route does not exist: ${body[DF.routeMethod]} ${body[DF.routeUrlMask]}`)
	else if (typeof delayed !== 'boolean')
		sendUnprocessableContent(response, `Expected boolean for "delayed"`)
	else {
		broker.setDelayed(delayed)
		sendOK(response)
	}
}

async function setRouteIsProxied(req, response) {
	const body = await parseJSON(req)
	const proxied = body[DF.proxied]
	const broker = mockBrokersCollection.brokerByRoute(
		body[DF.routeMethod],
		body[DF.routeUrlMask])

	if (!broker)
		sendUnprocessableContent(response, `Route does not exist: ${body[DF.routeMethod]} ${body[DF.routeUrlMask]}`)
	else if (typeof proxied !== 'boolean')
		sendUnprocessableContent(response, `Expected boolean for "proxied"`)
	else if (proxied && !config.proxyFallback)
		sendUnprocessableContent(response, `There’s no proxy fallback`)
	else {
		broker.setProxied(proxied)
		sendOK(response)
	}
}

async function updateProxyFallback(req, response) {
	const fallback = await parseJSON(req)
	if (!ConfigValidator.proxyFallback(fallback)) {
		sendUnprocessableContent(response, `Invalid Proxy Fallback URL`)
		return
	}
	if (!fallback)
		mockBrokersCollection.ensureAllRoutesHaveSelectedMock()
	config.proxyFallback = fallback
	sendOK(response)
}

async function setCollectProxied(req, response) {
	const collectProxied = await parseJSON(req)
	if (!ConfigValidator.collectProxied(collectProxied)) {
		sendUnprocessableContent(response, `Expected a boolean for "collectProxied"`)
		return
	}
	config.collectProxied = collectProxied
	sendOK(response)
}

async function bulkUpdateBrokersByCommentTag(req, response) {
	mockBrokersCollection.setMocksMatchingComment(await parseJSON(req))
	sendOK(response)
}

async function setCorsAllowed(req, response) {
	const corsAllowed = await parseJSON(req)
	if (!ConfigValidator.corsAllowed(corsAllowed)) {
		sendUnprocessableContent(response, `Expected boolean for "corsAllowed"`)
		return
	}
	config.corsAllowed = corsAllowed
	sendOK(response)
}

async function setGlobalDelay(req, response) {
	const delay = await parseJSON(req)
	if (!ConfigValidator.delay(delay)) {
		sendUnprocessableContent(response, `Expected non-negative integer for "delay"`)
		return
	}
	config.delay = delay
	sendOK(response)
}


async function setStaticRouteStatusCode(req, response) {
	const body = await parseJSON(req)
	const status = Number(body[DF.statusCode])
	const broker = staticCollection.brokerByRoute(body[DF.routeUrlMask])

	if (!broker)
		sendUnprocessableContent(response, `Static route does not exist: ${body[DF.routeUrlMask]}`)
	else if (!(status === 200 || status === 404))
		sendUnprocessableContent(response, `Expected 200 or 404 status code`)
	else {
		broker.setStatus(status)
		sendOK(response)
	}
}


async function setStaticRouteIsDelayed(req, response) {
	const body = await parseJSON(req)
	const delayed = body[DF.delayed]
	const broker = staticCollection.brokerByRoute(body[DF.routeUrlMask])

	if (!broker)
		sendUnprocessableContent(response, `Static route does not exist: ${body[DF.routeUrlMask]}`)
	else if (typeof delayed !== 'boolean')
		sendUnprocessableContent(response, `Expected boolean for "delayed"`)
	else {
		broker.setDelayed(delayed)
		sendOK(response)
	}
}

