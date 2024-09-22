/**
 * API for controlling Mockaton. For example, for
 * selecting a specific mock-file for a particular route.
 */

import { join } from 'node:path'
import { cookie } from './cookie.js'
import { Config } from './Config.js'
import { DF, API } from './ApiConstants.js'
import { parseJSON } from './utils/http-request.js'
import * as mockBrokersCollection from './mockBrokersCollection.js'
import { sendOK, sendBadRequest, sendJSON, sendFile } from './utils/http-response.js'


export const apiGetRequests = new Map([
	[API.dashboard, serveDashboard],
	['/Filename.js', serveDashboardAsset],
	['/Dashboard.js', serveDashboardAsset],
	['/Dashboard.css', serveDashboardAsset],
	['/ApiConstants.js', serveDashboardAsset],
	['/mockaton-logo.svg', serveDashboardAsset],
	[API.mocks, listMockBrokers],
	[API.cookies, listCookies],
	[API.comments, listComments]
])

export const apiPatchRequests = new Map([
	[API.select, selectMock],
	[API.delay, setRouteIsDelayed],
	[API.reset, reinitialize],
	[API.cookies, selectCookie],
	[API.fallback, updateProxyFallback],
	[API.bulkSelect, bulkUpdateBrokersByCommentTag]
])

function serveDashboard(_, response) { sendFile(response, join(import.meta.dirname, 'Dashboard.html')) }
function serveDashboardAsset(req, response) { sendFile(response, join(import.meta.dirname, req.url)) }

function listCookies(_, response) { sendJSON(response, cookie.list()) }
function listComments(_, response) { sendJSON(response, mockBrokersCollection.extractAllComments()) }
function listMockBrokers(_, response) { sendJSON(response, mockBrokersCollection.getAll()) }


function reinitialize(_, response) {
	mockBrokersCollection.init()
	sendOK(response)
}


async function selectCookie(req, response) {
	try {
		cookie.setCurrent(await parseJSON(req))
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
		Config.proxyFallback = await parseJSON(req)
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
