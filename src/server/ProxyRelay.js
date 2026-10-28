import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

import { extFor } from './utils/mime.js'
import { write, isFile, resolveIn } from './utils/fs.js'
import { IncomingMessage } from './utils/HttpIncomingMessage.js'
import { logger } from './utils/logger.js'

import { makeMockFilename } from '../client/Filename.js'
import { EXT_EMPTY, EXT_UNKNOWN_MIME } from '../client/ApiConstants.js'

import { config } from './stores/config.js'


export async function proxy(req, response, delay) {
	const hasReqBody = !(req.method === 'GET' || req.method === 'HEAD')
	let proxyRes
	let proxyResBody
	try {
		proxyRes = await fetch(config.proxyFallback + req.url, {
			method: req.method,
			headers: req.headers,
			body: hasReqBody ? req : undefined,
			duplex: hasReqBody ? 'half' : undefined
		})
		proxyResBody = Buffer.from(await proxyRes.arrayBuffer())
	}
	catch (error) { // TESTME
		if (error instanceof IncomingMessage.BodyReaderError)
			response.unprocessable(error.name)
		else {
			response.badGateway()
			logger.warn(error?.cause?.message ?? error?.message ?? error)
		}
		return
	}

	response.writeHead(proxyRes.status, {
		...excludeHopByHop(proxyRes.headers),
		'set-cookie': proxyRes.headers.getSetCookie(), // parses multiple into an array
		'cache-control': 'no-cache'
	})

	if (config.collectProxied)
		if (config.readOnly)
			logger.warn('Write denied. config.readOnly is true')
		else {
			const mime = proxyRes.headers.get('content-type')
			const ext = mime
				? extFor(mime) || EXT_UNKNOWN_MIME
				: EXT_EMPTY
			await saveMockToDisk(req.url, req.method, proxyRes.status, ext, proxyResBody)
		}

	setTimeout(() => response.end(proxyResBody), delay)
}

function excludeHopByHop(headers) {
	const res = Object.fromEntries(headers)
	for (const name of excludeHopByHop.HEADERS)
		delete res[name]
	return res
}
excludeHopByHop.HEADERS = [
	'connection',
	'keep-alive',
	'proxy-authenticate',
	'proxy-authorization',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade',
	'content-encoding',
	'content-length'
]


async function saveMockToDisk(url, method, status, ext, body) {
	if (config.formatCollectedJSON && ext === 'json')
		try {
			body = JSON.stringify(JSON.parse(body.toString()), null, '  ')
		}
		catch (err) {
			logger.warn('Invalid JSON response', err)
		}

	try {
		const f = makeUniqueMockFilename(url, method, status, ext)
		if (!await resolveIn(config.mocksDir, f))
			throw new Error('Attempted write outside config.mocksDir')
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

