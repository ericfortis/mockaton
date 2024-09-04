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
import { sendOK, sendBadRequest, sendJSON, sendFile } from './utils/http-response.js'


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
	[API.bulkSelect, bulkUpdateBrokersByCommentTag],
	[API.edit, updateBroker],
	[API.reset, reinitialize],
	[API.cookies, selectCookie],
	[API.transform, updateBrokerTransform]
])

function serveDashboard(_, response) {
	sendFile(response, join(import.meta.dirname, 'Dashboard.html'))
}
function serveDashboardAsset(req, response) {
	sendFile(response, join(import.meta.dirname, req.url))
}
function listCookies(_, response) {
	sendJSON(response, cookie.list())
}
function listComments(_, response) {
	sendJSON(response, mockBrokersCollection.extractAllComments())
}
function listMockBrokers(_, response) {
	sendJSON(response, mockBrokersCollection.getAll())
}


async function selectCookie(req, response) {
	try {
		const body = await parseJSON(req)
		cookie.setCurrent(body[DF.currentCookieKey])
		sendOK(response)
	}
	catch (error) {
		console.error(error)
		sendBadRequest(response)
	}
}

function reinitialize(_, response) {
	Config.database = {}
	mockBrokersCollection.init()
	sendOK(response)
}

async function updateBroker(req, response) {
	try {
		const body = await parseJSON(req)
		const broker = mockBrokersCollection.getBrokerByFilename(body[DF.file])
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

async function bulkUpdateBrokersByCommentTag(req, response) {
	try {
		const body = await parseJSON(req)
		mockBrokersCollection.setMocksMatchingComment(body[DF.comment])
		sendOK(response)
	}
	catch (error) {
		console.error(error)
		sendBadRequest(response)
	}
}

async function updateBrokerTransform(req, response) {
	try {
		const body = await parseJSON(req)
		const broker = mockBrokersCollection.getBrokerByFilename(body[DF.file])
		broker.updateTransform(body[DF.file])
		sendOK(response)
	}
	catch (error) {
		console.error(error)
		sendBadRequest(response)
	}
}
