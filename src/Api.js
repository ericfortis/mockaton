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


const dashboardAssets = [
	'/ApiConstants.js',
	'/Commander.js',
	'/Dashboard.css',
	'/Dashboard.js',
	'/Filename.js',
	'/logo.svg'
]

export const apiGetRequests = new Map([
	[API.dashboard, serveDashboard],
	...dashboardAssets.map(f => [API.dashboard + f, serveDashboardAsset(f)]),
	[API.cors, getIsCorsAllowed],
	[API.static, listStaticFiles],
	[API.mocks, listMockBrokers],
	[API.cookies, listCookies],
	[API.fallback, getProxyFallback],
	[API.comments, listComments],
	[API.globalDelay, getGlobalDelay],
	[API.syncVersion, longPollClientSyncVersion],
	[API.collectProxied, getCollectProxied]
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

function serveDashboard(_, response) {
	sendFile(response, join(import.meta.dirname, 'Dashboard.html'))
}

function serveDashboardAsset(f) {
	return (req, response) =>
		sendFile(response, join(import.meta.dirname, f))
}

function listCookies(_, response) { sendJSON(response, cookie.list()) }
function listComments(_, response) { sendJSON(response, mockBrokersCollection.extractAllComments()) }

function listStaticFiles(_, response) { sendJSON(response, staticCollection.all()) }
function listMockBrokers(_, response) { sendJSON(response, mockBrokersCollection.all()) }

function getGlobalDelay(_, response) { sendJSON(response, config.delay) }
function getProxyFallback(_, response) { sendJSON(response, config.proxyFallback) }
function getCollectProxied(_, response) { sendJSON(response, config.collectProxied) }
function getIsCorsAllowed(_, response) { sendJSON(response, config.corsAllowed) }

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
	staticCollection.init() // TESTME
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

	if (!broker) // TESTME
		sendUnprocessableContent(response, `Route does not exist: ${body[DF.routeMethod]} ${body[DF.routeUrlMask]}`)
	else if (typeof delayed !== 'boolean')
		sendUnprocessableContent(response, `Expected a boolean for "delayed"`) // TESTME
	else {
		broker.setDelayed(delayed)
		sendOK(response)
	}
}

async function setRouteIsProxied(req, response) { // TESTME
	const body = await parseJSON(req)
	const proxied = body[DF.proxied]
	const broker = mockBrokersCollection.brokerByRoute(
		body[DF.routeMethod],
		body[DF.routeUrlMask])

	if (!broker)
		sendUnprocessableContent(response, `Route does not exist: ${body[DF.routeMethod]} ${body[DF.routeUrlMask]}`)
	else if (typeof proxied !== 'boolean')
		sendUnprocessableContent(response, `Expected a boolean for "proxied"`)
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
		sendUnprocessableContent(response)
		return
	}
	if (!fallback) // TESTME
		mockBrokersCollection.ensureAllRoutesHaveSelectedMock()
	config.proxyFallback = fallback
	sendOK(response)
}

async function setCollectProxied(req, response) {
	const collectProxied = await parseJSON(req)
	if (!ConfigValidator.collectProxied(collectProxied)) { // TESTME
		sendUnprocessableContent(response)
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
	config.corsAllowed = await parseJSON(req)
	sendOK(response)
}

async function setGlobalDelay(req, response) { // TESTME
	config.delay = parseInt(await parseJSON(req), 10)
	sendOK(response)
}


async function setStaticRouteStatusCode(req, response) {
	const body = await parseJSON(req)
	const status = Number(body[DF.statusCode])
	const broker = staticCollection.brokerByRoute(body[DF.routeUrlMask])

	if (!broker) // TESTME
		sendUnprocessableContent(response, `Route does not exist: ${body[DF.routeUrlMask]}`)
	else if (!(status === 200 || status === 404))
		sendUnprocessableContent(response, `Expected a 200 or 404 status code. Received ${status}`) // TESTME
	else {
		broker.setStatus(status)
		sendOK(response)
	}
}


async function setStaticRouteIsDelayed(req, response) {
	const body = await parseJSON(req)
	const delayed = body[DF.delayed]
	const broker = staticCollection.brokerByRoute(body[DF.routeUrlMask])

	if (!broker) // TESTME
		sendUnprocessableContent(response, `Route does not exist: ${body[DF.routeUrlMask]}`)
	else if (typeof delayed !== 'boolean')
		sendUnprocessableContent(response, `Expected a boolean for "delayed". Received ${delayed}`) // TESTME
	else {
		broker.setDelayed(delayed)
		sendOK(response)
	}
}

