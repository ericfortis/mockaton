import { join } from 'node:path'
import { write } from './utils/fs.js'
import { Config } from './Config.js'
import { extFor } from './utils/mime.js'
import { readBody } from './utils/http-request.js'
import { makeMockFilename } from './Filename.js'


export async function proxy(req, response) {
	const proxyResponse = await fetch(Config.proxyFallback + req.url, {
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

	if (Config.collectProxied) { // TESTME
		const ext = extFor(proxyResponse.headers.get('content-type'))
		const filename = makeMockFilename(req.url, req.method, proxyResponse.status, ext)
		write(join(Config.mocksDir, filename), body)
	}
}
