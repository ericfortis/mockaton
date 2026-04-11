import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

import { extFor } from './utils/mime.js'
import { write, isFile } from './utils/fs.js'
import { readBody, BodyReaderError } from './utils/HttpIncomingMessage.js'

import { config } from './config.js'
import { logger } from './utils/logger.js'
import { makeMockFilename } from '../client/Filename.js'


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
			response.unprocessable(error.name)
		else
			response.badGateway(error)
		return
	}

	response.writeHead(proxyResponse.status, {
		...Object.fromEntries(proxyResponse.headers),
		'Set-Cookie': proxyResponse.headers.getSetCookie() // parses multiple into an array
	})
	const body = await proxyResponse.text()
	setTimeout(() => response.end(body), delay) // TESTME

	if (config.collectProxied) {
		const ext = extFor(proxyResponse.headers.get('content-type'))
		await saveMockToDisk(req.url, req.method, proxyResponse.status, ext, body)
	}
}

async function saveMockToDisk(url, method, status, ext, body) {
	if (config.formatCollectedJSON && ext === 'json')
		try {
			body = JSON.stringify(JSON.parse(body), null, '  ')
		}
		catch (err) {
			logger.warn('Invalid JSON response', err)
		}

	try {
		await write(makeUniqueMockFilename(url, method, status, ext), body)
	}
	catch (err) {
		logger.warn('Write access denied', err)
	}
}

function makeUniqueMockFilename(url, method, status, ext) {
	let file = makeMockFilename(url, method, status, ext)
	if (isFile(join(config.mocksDir, file)))
		file = makeMockFilename(url, method, status, ext, `(${randomUUID()})`)
	return join(config.mocksDir, file)
}

