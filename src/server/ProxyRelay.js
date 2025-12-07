import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

import { extFor } from './utils/mime.js'
import { write, isFile } from './utils/fs.js'
import { readBody, BodyReaderError } from './utils/HttpIncomingMessage.js'

import { config } from './config.js'
import { makeMockFilename } from './Filename.js'


export async function proxy(req, response, delay) {
	let proxyResponse
	try {
		proxyResponse = await fetch(config.proxyFallback + req.url, {
			method: req.method,
			headers: req.headers,
			body: req.method === 'GET' || req.method === 'HEAD'
				? undefined
				: await readBody(req)
		})
	}
	catch (error) { // TESTME
		if (error instanceof BodyReaderError)
			response.sendUnprocessable(error.name)
		else
			response.sendBadGateway(error)
		return
	}

	const headers = Object.fromEntries(proxyResponse.headers)
	headers['set-cookie'] = proxyResponse.headers.getSetCookie() // parses multiple into an array
	response.writeHead(proxyResponse.status, headers)
	const body = await proxyResponse.text()
	setTimeout(() => response.end(body), delay) // TESTME

	if (config.collectProxied) {
		const ext = extFor(proxyResponse.headers.get('content-type'))
		let filename = makeMockFilename(req.url, req.method, proxyResponse.status, ext)
		if (isFile(join(config.mocksDir, filename))) // TESTME
			filename = makeMockFilename(req.url + `(${randomUUID()})`, req.method, proxyResponse.status, ext)

		let data = body
		if (config.formatCollectedJSON && ext === 'json') // TESTME
			try {
				data = JSON.stringify(JSON.parse(body), null, '  ')
			}
			catch {}
		write(join(config.mocksDir, filename), data)
	}
}
