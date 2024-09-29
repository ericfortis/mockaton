import { equal } from 'node:assert/strict'
import { promisify } from 'node:util'
import { createServer } from 'node:http'
import { describe, it, after } from 'node:test'
import { isPreflight, setCorsHeaders, CorsHeader as CH } from './http-cors.js'


function headerIs(response, header, value) {
	equal(response.headers.get(header), value)
}

const FooDotCom = 'http://foo.com'
const AllowedDotCom = 'http://allowed.com'
const NotAllowedDotCom = 'http://not-allowed.com'

await describe('CORS', async () => {
	let corsAllow = {}

	const server = createServer((req, response) => {
		setCorsHeaders(req, response, corsAllow)
		if (isPreflight(req)) {
			response.statusCode = 204
			response.end()
		}
		else
			response.end('NON_PREFLIGHT')
	})
	await promisify(server.listen).bind(server, 0, '127.0.0.1')()
	after(() => {
		server.close()
	})
	function preflight(headers, method = 'OPTIONS') {
		const { address, port } = server.address()
		return fetch(`http://${address}:${port}/`, { method, headers })
	}
	function request(headers, method) {
		const { address, port } = server.address()
		return fetch(`http://${address}:${port}/`, { method, headers })
	}

	await describe('Identifies Preflight Requests', async () => {
		const requiredRequestHeaders = {
			[CH.Origin]: 'http://locahost:9999',
			[CH.AccessControlRequestMethod]: 'POST'
		}

		await it('Ignores non-OPTIONS requests', async () => {
			const res = await request(requiredRequestHeaders, 'POST')
			equal(await res.text(), 'NON_PREFLIGHT')
		})

		await it(`Ignores non-parseable req ${CH.Origin} header`, async () => {
			const headers = {
				...requiredRequestHeaders,
				[CH.Origin]: 'non-url'
			}
			const res = await preflight(headers)
			equal(await res.text(), 'NON_PREFLIGHT')
		})

		await it(`Ignores missing method in ${CH.AccessControlRequestMethod} header`, async () => {
			const headers = { ...requiredRequestHeaders }
			delete headers[CH.AccessControlRequestMethod]
			const res = await preflight(headers)
			equal(await res.text(), 'NON_PREFLIGHT')
		})

		await it(`Ignores non-standard method in ${CH.AccessControlRequestMethod} header`, async () => {
			const headers = {
				...requiredRequestHeaders,
				[CH.AccessControlRequestMethod]: 'NON_STANDARD'
			}
			const res = await preflight(headers)
			equal(await res.text(), 'NON_PREFLIGHT')
		})

		await it('204 valid preflights', async () => {
			const res = await preflight(requiredRequestHeaders)
			equal(res.status, 204)
		})
	})

	await describe('Preflight Response Headers', async () => {
		await it('no origins allowed', async () => {
			corsAllow = {
				origins: [],
				methods: ['GET']
			}
			const p = await preflight({
				[CH.Origin]: FooDotCom,
				[CH.AccessControlRequestMethod]: 'GET'
			})
			headerIs(p, CH.AccessControlAllowOrigin, null)
			headerIs(p, CH.AccessControlAllowMethods, null)
			headerIs(p, CH.AccessControlAllowCredentials, null)
			headerIs(p, CH.AccessControlAllowHeaders, null)
			headerIs(p, CH.AccessControlMaxAge, null)
		})

		await it('not in allowed origins', async () => {
			corsAllow = {
				origins: [AllowedDotCom],
				methods: ['GET']
			}
			const p = await preflight({
				[CH.Origin]: NotAllowedDotCom,
				[CH.AccessControlRequestMethod]: 'GET'
			})
			headerIs(p, CH.AccessControlAllowOrigin, null)
			headerIs(p, CH.AccessControlAllowMethods, null)
			headerIs(p, CH.AccessControlAllowCredentials, null)
			headerIs(p, CH.AccessControlAllowHeaders, null)
		})

		await it('origin and method match', async () => {
			corsAllow = {
				origins: [AllowedDotCom],
				methods: ['GET']
			}
			const p = await preflight({
				[CH.Origin]: AllowedDotCom,
				[CH.AccessControlRequestMethod]: 'GET'
			})
			headerIs(p, CH.AccessControlAllowOrigin, AllowedDotCom)
			headerIs(p, CH.AccessControlAllowMethods, 'GET')
			headerIs(p, CH.AccessControlAllowCredentials, null)
			headerIs(p, CH.AccessControlAllowHeaders, null)
		})

		await it('origin matches from multiple', async () => {
			corsAllow = {
				origins: [AllowedDotCom, FooDotCom],
				methods: ['GET']
			}
			const p = await preflight({
				[CH.Origin]: AllowedDotCom,
				[CH.AccessControlRequestMethod]: 'GET'
			})
			headerIs(p, CH.AccessControlAllowOrigin, AllowedDotCom)
			headerIs(p, CH.AccessControlAllowMethods, 'GET')
			headerIs(p, CH.AccessControlAllowCredentials, null)
			headerIs(p, CH.AccessControlAllowHeaders, null)
		})

		await it('wildcard origin', async () => {
			corsAllow = {
				origins: ['*'],
				methods: ['GET']
			}
			const p = await preflight({
				[CH.Origin]: FooDotCom,
				[CH.AccessControlRequestMethod]: 'GET'
			})
			headerIs(p, CH.AccessControlAllowOrigin, FooDotCom)
			headerIs(p, CH.AccessControlAllowMethods, 'GET')
			headerIs(p, CH.AccessControlAllowCredentials, null)
			headerIs(p, CH.AccessControlAllowHeaders, null)
		})

		await it(`wildcard and credentials`, async () => {
			corsAllow = {
				origins: ['*'],
				methods: ['GET'],
				credentials: true
			}
			const p = await preflight({
				[CH.Origin]: FooDotCom,
				[CH.AccessControlRequestMethod]: 'GET'
			})
			headerIs(p, CH.AccessControlAllowOrigin, FooDotCom)
			headerIs(p, CH.AccessControlAllowMethods, 'GET')
			headerIs(p, CH.AccessControlAllowCredentials, 'true')
			headerIs(p, CH.AccessControlAllowHeaders, null)
		})

		await it(`wildcard, credentials, and headers`, async () => {
			corsAllow = {
				origins: ['*'],
				methods: ['GET'],
				credentials: true,
				headers: ['content-type', 'my-header']
			}
			const p = await preflight({
				[CH.Origin]: FooDotCom,
				[CH.AccessControlRequestMethod]: 'GET'
			})
			headerIs(p, CH.AccessControlAllowOrigin, FooDotCom)
			headerIs(p, CH.AccessControlAllowMethods, 'GET')
			headerIs(p, CH.AccessControlAllowCredentials, 'true')
			headerIs(p, CH.AccessControlAllowHeaders, 'content-type,my-header')
		})
	})

	await describe('Non-Preflight (Actual Response) Headers', async () => {
		await it('no origins allowed', async () => {
			corsAllow = {
				origins: [],
				methods: ['GET']
			}
			const p = await request({
				[CH.Origin]: NotAllowedDotCom
			})
			equal(p.status, 200)
			headerIs(p, CH.AccessControlAllowOrigin, null)
			headerIs(p, CH.AccessControlAllowCredentials, null)
			headerIs(p, CH.AccessControlExposeHeaders, null)
		})

		await it('origin allowed', async () => {
			corsAllow = {
				origins: [AllowedDotCom],
				methods: ['GET'],
				credentials: true,
				exposedHeaders: ['x-h1', 'x-h2']
			}
			const p = await request({
				[CH.Origin]: AllowedDotCom
			})
			equal(p.status, 200)
			headerIs(p, CH.AccessControlAllowOrigin, AllowedDotCom)
			headerIs(p, CH.AccessControlAllowCredentials, 'true')
			headerIs(p, CH.AccessControlExposeHeaders, 'x-h1,x-h2')
		})
	})
})
