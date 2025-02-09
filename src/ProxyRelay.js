import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { write } from './utils/fs.js'
import { config } from './config.js'
import { extFor } from './utils/mime.js'
import { readBody } from './utils/http-request.js'
import { makeMockFilename } from './Filename.js'


export async function proxy(req, response) {
	const proxyResponse = await fetch(config.proxyFallback + req.url, {
		method: req.method,
		headers: req.headers,
		body: req.method === 'GET' || req.method === 'HEAD'
			? undefined
			: await readBody(req)
	})

	const headers = Object.fromEntries(proxyResponse.headers)
	headers['set-cookie'] = proxyResponse.headers.getSetCookie() // parses multiple into an array
	response.writeHead(proxyResponse.status, headers)
	const body = await proxyResponse.text()
	response.end(body)

	if (config.collectProxied) {
		const ext = extFor(proxyResponse.headers.get('content-type'))
		let filename = makeMockFilename(req.url, req.method, proxyResponse.status, ext)
		if (existsSync(join(config.mocksDir, filename))) // TESTME
			filename = makeMockFilename(req.url + `(${randomUUID()})`, req.method, proxyResponse.status, ext)
		write(join(config.mocksDir, filename), body)
	}
}
