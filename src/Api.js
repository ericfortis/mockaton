/**
 * API for controlling Mockaton. For example, for
 * selecting a specific mock-file for a particular route.
 */

import { join } from 'node:path'
import { cookie } from './cookie.js'
import { config } from './config.js'
import { DF, API } from './ApiConstants.js'
import { parseJSON } from './utils/http-request.js'
import { listFilesRecursively } from './utils/fs.js'
import * as mockBrokersCollection from './mockBrokersCollection.js'
import { sendOK, sendBadRequest, sendJSON, sendFile, sendUnprocessableContent } from './utils/http-response.js'


export const apiGetRequests = new Map([
	[API.dashboard, serveDashboard],
	['/Filename.js', serveDashboardAsset],
	['/Dashboard.js', serveDashboardAsset],
	['/Dashboard.css', serveDashboardAsset],
	['/ApiConstants.js', serveDashboardAsset],
	['/Commander.js', serveDashboardAsset],
	['/mockaton-logo.svg', serveDashboardAsset],
	[API.mocks, listMockBrokers],
	[API.cookies, listCookies],
	[API.comments, listComments],
	[API.fallback, getProxyFallback],
	[API.cors, getIsCorsAllowed],
	[API.collectProxied, getCollectProxied],
	[API.static, listStaticFiles]
])

export const apiPatchRequests = new Map([
	[API.select, selectMock],
	[API.delay, setRouteIsDelayed],
	[API.reset, reinitialize],
	[API.cookies, selectCookie],
	[API.fallback, updateProxyFallback],
	[API.collectProxied, setCollectProxied],
	[API.bulkSelect, bulkUpdateBrokersByCommentTag],
	[API.cors, setCorsAllowed]
])

/* === GET === */

function serveDashboard(_, response) { sendFile(response, join(import.meta.dirname, 'Dashboard.html')) }
function serveDashboardAsset(req, response) { sendFile(response, join(import.meta.dirname, req.url)) }

function listCookies(_, response) { sendJSON(response, cookie.list()) }
function listComments(_, response) { sendJSON(response, mockBrokersCollection.extractAllComments()) }
function listMockBrokers(_, response) { sendJSON(response, mockBrokersCollection.getAll()) }
function getProxyFallback(_, response) { sendJSON(response, config.proxyFallback) }
function getIsCorsAllowed(_, response) { sendJSON(response, config.corsAllowed) }
function getCollectProxied(_, response) { sendJSON(response, config.collectProxied) }

function listStaticFiles(req, response) {
	try {
		const files = config.staticDir
			? listFilesRecursively(config.staticDir).filter(f => !config.ignore.test(f))
			: []
		sendJSON(response, files)
	}
	catch (error) {
		sendBadRequest(response, error)
	}
}


/* === PATCH === */

function reinitialize(_, response) {
	mockBrokersCollection.init()
	sendOK(response)
}

async function selectCookie(req, response) {
	try {
		const error = cookie.setCurrent(await parseJSON(req))
		if (error)
			sendUnprocessableContent(response, error)
		else
			sendOK(response)
	}
	catch (error) {
		sendBadRequest(response, error)
	}
}

async function selectMock(req, response) {
	try {
		const file = await parseJSON(req)
		const broker = mockBrokersCollection.getBrokerByFilename(file)
		if (!broker || !broker.mockExists(file))
			throw `Missing Mock: ${file}`
		broker.updateFile(file)
		sendOK(response)
	}
	catch (error) {
		sendBadRequest(response, error)
	}
}

async function setRouteIsDelayed(req, response) {
	try {
		const body = await parseJSON(req)
		const broker = mockBrokersCollection.getBrokerForUrl(
			body[DF.routeMethod],
			body[DF.routeUrlMask])
		if (!broker)
			throw `Route does not exist: ${body[DF.routeUrlMask]} ${body[DF.routeUrlMask]}`
		broker.updateDelay(body[DF.delayed])
		sendOK(response)
	}
	catch (error) {
		sendBadRequest(response, error)
	}
}

async function updateProxyFallback(req, response) {
	try {
		const fallback = await parseJSON(req)
		if (fallback && !URL.canParse(fallback))
			sendUnprocessableContent(response)
		else {
			config.proxyFallback = fallback
			sendOK(response)
		}
	}
	catch (error) {
		sendBadRequest(response, error)
	}
}

async function setCollectProxied(req, response) {
	try {
		config.collectProxied = await parseJSON(req)
		sendOK(response)
	}
	catch (error) {
		sendBadRequest(response, error)
	}
}

async function bulkUpdateBrokersByCommentTag(req, response) {
	try {
		mockBrokersCollection.setMocksMatchingComment(await parseJSON(req))
		sendOK(response)
	}
	catch (error) {
		sendBadRequest(response, error)
	}
}

async function setCorsAllowed(req, response) {
	try {
		config.corsAllowed = await parseJSON(req)
		sendOK(response)
	}
	catch (error) {
		sendBadRequest(response, error)
	}
}

