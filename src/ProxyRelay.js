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
		body: req.method === 'GET' || req.method === 'HEAD' // TESTME
			? undefined
			: await readBody(req)
	})
	// TODO investigate how to include many repeated headers such as set-cookie
	response.writeHead(proxyResponse.status, Object.fromEntries(proxyResponse.headers))
	const body = await proxyResponse.text()
	response.end(body)

	if (Config.collectProxied) { // TESTME
		const ext = extFor(proxyResponse.headers.get('content-type'))
		const filename = makeMockFilename(req.url, req.method, proxyResponse.status, ext)
		write(join(Config.mocksDir, filename), body)
	}
}
