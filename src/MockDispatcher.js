import { join } from 'node:path'
import { readFileSync } from 'node:fs'

import { DF } from './ApiConstants.js'
import { proxy } from './ProxyRelay.js'
import { cookie } from './cookie.js'
import { Config } from './Config.js'
import { mimeFor } from './utils/mime.js'
import * as mockBrokerCollection from './mockBrokersCollection.js'
import { parseJSON, JsonBodyParserError } from './utils/http-request.js'
import { sendInternalServerError, sendNotFound, sendFile, sendBadRequest } from './utils/http-response.js'


export async function dispatchMock(req, response) {
	/* Serve Documentation */
	if (req.method === 'GET' && req.url.endsWith('.md')) {
		sendFile(response, join(Config.mocksDir, decodeURIComponent(req.url)))
		return
	}

	const broker = mockBrokerCollection.getBrokerForUrl(req.method, req.url)
	if (!broker) {
		if (Config.proxyFallback)
			await proxy(req, response)
		else
			sendNotFound(response)
		return
	}

	try {
		const { file, status, delay, currentTransform } = broker
		console.log('\n', req.url, '→\n ', file)

		response.statusCode = status
		response.setHeader('content-type', mimeFor(file))
		if (cookie.getCurrent())
			response.setHeader('set-cookie', cookie.getCurrent())

		let mockAsText = readMock(file)
		if (broker.currentTransform) {
			const body = await requestBodyForTransform(req, mockAsText)
			const transformFunc = await importTransformFunc(currentTransform)
			mockAsText = transformFunc(mockAsText, body, Config)
		}
		setTimeout(() => response.end(mockAsText), delay)
	}
	catch (error) {
		console.error(error)
		if (error instanceof JsonBodyParserError)
			sendBadRequest(response)
		else if (error.code === 'ENOENT')
			sendNotFound(response) // file has been deleted
		else
			sendInternalServerError(response)
	}
}

const nonSafeMethods = ['PATCH', 'POST', 'PUT', 'DELETE', 'CONNECT']

async function requestBodyForTransform(req, mockAsText) {
	if (nonSafeMethods.includes(req.method))
		return req.headers[DF.isForDashboard] // TODO unit TESTME
			? JSON.parse(mockAsText)
			: await parseJSON(req)
	return ''
}

function readMock(file) {
	return readFileSync(join(Config.mocksDir, file), 'utf8')
}

async function importTransformFunc(file) {
	// The date param is just for cache busting
	return (await import(join(Config.mocksDir, file) + '?' + Date.now())).default
}
