import { Config } from './Config.js'


export async function proxy(req, response) {
	const proxyResponse = await fetch(Config.proxyFallback + req.url, {
		method: req.method,
		headers: req.headers
	})
	response.writeHead(proxyResponse.status, proxyResponse.headers)
	response.end(await proxyResponse.text())
}
