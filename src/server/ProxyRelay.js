import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

import { extFor } from './utils/mime.js'
import { write, isFile, resolveIn } from './utils/fs.js'
import { readBody, BodyReaderError } from './utils/HttpIncomingMessage.js'

import { config } from './config.js'
import { logger } from './utils/logger.js'
import { makeMockFilename } from '../client/Filename.js'
import { EXT_EMPTY, EXT_UNKNOWN_MIME } from '../client/ApiConstants.js'


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
		else {
			response.badGateway()
			logger.warn(error.cause.message)
		}
		return
	}

	response.writeHead(proxyResponse.status, {
		...Object.fromEntries(proxyResponse.headers),
		'set-cookie': proxyResponse.headers.getSetCookie(), // parses multiple into an array
		'cache-control': 'no-cache'
	})
	const body = await proxyResponse.text()
	setTimeout(() => response.end(body), delay) // TESTME

	if (config.collectProxied) {
		if (config.readOnly) {
			logger.info('Write denied: config.readOnly is true')
			return
		}
		const mime = proxyResponse.headers.get('content-type')
		const ext = mime
			? extFor(mime) || EXT_UNKNOWN_MIME
			: EXT_EMPTY
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
		const f = makeUniqueMockFilename(url, method, status, ext)
		if (!resolveIn(config.mocksDir, f))
			throw 'Attempted write outside config.mocksDir'
		await write(f, body)
	}
	catch (err) {
		logger.warn('Write denied', err)
	}
}

function makeUniqueMockFilename(url, method, status, ext) {
	let file = makeMockFilename(url, method, status, ext)
	if (isFile(join(config.mocksDir, file)))
		file = makeMockFilename(url, method, status, ext, `(${randomUUID()})`)
	return join(config.mocksDir, file)
}

