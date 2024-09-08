/**
 * API for controlling the mock server. For example,
 * setting a specific mock-file for a particular route.
 */

import { join } from 'node:path'
import { cookie } from './cookie.js'
import { Config } from './Config.js'
import { DF, API } from './ApiConstants.js'
import { parseJSON } from './utils/http-request.js'
import * as mockBrokersCollection from './mockBrokersCollection.js'
import { sendOK, sendBadRequest, sendJSON, sendFile, sendUnprocessableContent } from './utils/http-response.js'


export const apiGetRequests = new Map([
	[API.dashboard, serveDashboard],
	['/Route.js', serveDashboardAsset],
	['/Dashboard.js', serveDashboardAsset],
	['/Dashboard.css', serveDashboardAsset],
	['/ApiConstants.js', serveDashboardAsset],
	[API.mocks, listMockBrokers],
	[API.cookies, listCookies],
	[API.comments, listComments]
])

export const apiPatchRequests = new Map([
	[API.edit, updateBroker],
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
		console.error(error)
		sendBadRequest(response)
	}
}

async function updateBroker(req, response) {
	try {
		const body = await parseJSON(req)
		const broker = mockBrokersCollection.getBrokerByFilename(body[DF.file])
		if (!broker) {
			sendUnprocessableContent(response)
			return
		}
		if (DF.delayed in body)
			broker.updateDelay(body[DF.delayed])
		broker.updateFile(body[DF.file])
		sendOK(response)
	}
	catch (error) {
		console.error(error)
		sendBadRequest(response)
	}
}

async function updateProxyFallback(req, response) {
	try {
		Config.proxyFallback = await parseJSON(req)
		sendOK(response)
	}
	catch (error) {
		console.error(error)
		sendBadRequest(response)
	}
}

async function bulkUpdateBrokersByCommentTag(req, response) {
	try {
		mockBrokersCollection.setMocksMatchingComment(await parseJSON(req))
		sendOK(response)
	}
	catch (error) {
		console.error(error)
		sendBadRequest(response)
	}
}
