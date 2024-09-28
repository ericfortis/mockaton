import { equal } from 'node:assert/strict'
import { promisify } from 'node:util'
import { createServer } from 'node:http'
import { describe, it, after } from 'node:test'
import { isPreflight, setCorsHeaders, PreflightHeader as PH } from './http-cors.js'


function headerIs(response, header, value) {
	equal(response.headers.get(header), value)
}

const FooDotCom = 'http://foo.com'
const AllowedDotCom = 'http://allowed.com'
const NotAllowedDotCom = 'http://not-allowed.com'

await describe('CORS', async () => {
	let corsAllow = {}

	const server = createServer((req, response) => {
		if (isPreflight(req)) {
			setCorsHeaders(req, response, corsAllow)
			response.statusCode = 204
			response.end()
			return
		}
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

	await describe('Identifies Preflight Requests', async () => {
		const requiredRequestHeaders = {
			[PH.Origin]: 'http://locahost:9999',
			[PH.AccessControlRequestMethod]: 'POST'
		}

		await it('Ignores non-OPTIONS requests', async () => {
			const res = await preflight(requiredRequestHeaders, 'POST')
			equal(await res.text(), 'NON_PREFLIGHT')
		})

		await it(`Ignores non-parseable req ${PH.Origin} header`, async () => {
			const headers = {
				...requiredRequestHeaders,
				[PH.Origin]: 'non-url'
			}
			const res = await preflight(headers)
			equal(await res.text(), 'NON_PREFLIGHT')
		})

		await it(`Ignores missing method in ${PH.AccessControlRequestMethod} header`, async () => {
			const headers = { ...requiredRequestHeaders }
			delete headers[PH.AccessControlRequestMethod]
			const res = await preflight(headers)
			equal(await res.text(), 'NON_PREFLIGHT')
		})

		await it(`Ignores non-standard method in ${PH.AccessControlRequestMethod} header`, async () => {
			const headers = {
				...requiredRequestHeaders,
				[PH.AccessControlRequestMethod]: 'NON_STANDARD'
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
				[PH.Origin]: FooDotCom,
				[PH.AccessControlRequestMethod]: 'GET'
			})
			headerIs(p, PH.AccessControlAllowOrigin, null)
			headerIs(p, PH.AccessControlAllowMethods, null)
			headerIs(p, PH.AccessControlAllowCredentials, null)
			headerIs(p, PH.AccessControlAllowHeaders, null)
		})

		await it('not in allowed origins', async () => {
			corsAllow = {
				origins: [AllowedDotCom],
				methods: ['GET']
			}
			const p = await preflight({
				[PH.Origin]: NotAllowedDotCom,
				[PH.AccessControlRequestMethod]: 'GET'
			})
			headerIs(p, PH.AccessControlAllowOrigin, null)
			headerIs(p, PH.AccessControlAllowMethods, null)
			headerIs(p, PH.AccessControlAllowCredentials, null)
			headerIs(p, PH.AccessControlAllowHeaders, null)
		})

		await it('origin and method match', async () => {
			corsAllow = {
				origins: [AllowedDotCom],
				methods: ['GET']
			}
			const p = await preflight({
				[PH.Origin]: AllowedDotCom,
				[PH.AccessControlRequestMethod]: 'GET'
			})
			headerIs(p, PH.AccessControlAllowOrigin, AllowedDotCom)
			headerIs(p, PH.AccessControlAllowMethods, 'GET')
			headerIs(p, PH.AccessControlAllowCredentials, null)
			headerIs(p, PH.AccessControlAllowHeaders, null)
		})

		await it('origin matches from multiple', async () => {
			corsAllow = {
				origins: [AllowedDotCom, FooDotCom],
				methods: ['GET']
			}
			const p = await preflight({
				[PH.Origin]: AllowedDotCom,
				[PH.AccessControlRequestMethod]: 'GET'
			})
			headerIs(p, PH.AccessControlAllowOrigin, AllowedDotCom)
			headerIs(p, PH.AccessControlAllowMethods, 'GET')
			headerIs(p, PH.AccessControlAllowCredentials, null)
			headerIs(p, PH.AccessControlAllowHeaders, null)
		})

		await it('wildcard origin', async () => {
			corsAllow = {
				origins: ['*'],
				methods: ['GET']
			}
			const p = await preflight({
				[PH.Origin]: FooDotCom,
				[PH.AccessControlRequestMethod]: 'GET'
			})
			headerIs(p, PH.AccessControlAllowOrigin, FooDotCom)
			headerIs(p, PH.AccessControlAllowMethods, 'GET')
			headerIs(p, PH.AccessControlAllowCredentials, null)
			headerIs(p, PH.AccessControlAllowHeaders, null)
		})

		await it(`wildcard and credentials`, async () => {
			corsAllow = {
				origins: ['*'],
				methods: ['GET'],
				credentials: true
			}
			const p = await preflight({
				[PH.Origin]: FooDotCom,
				[PH.AccessControlRequestMethod]: 'GET'
			})
			headerIs(p, PH.AccessControlAllowOrigin, FooDotCom)
			headerIs(p, PH.AccessControlAllowMethods, 'GET')
			headerIs(p, PH.AccessControlAllowCredentials, 'true')
			headerIs(p, PH.AccessControlAllowHeaders, null)
		})

		await it(`wildcard, credentials, and headers`, async () => {
			corsAllow = {
				origins: ['*'],
				methods: ['GET'],
				credentials: true,
				headers: ['content-type', 'my-header']
			}
			const p = await preflight({
				[PH.Origin]: FooDotCom,
				[PH.AccessControlRequestMethod]: 'GET'
			})
			headerIs(p, PH.AccessControlAllowOrigin, FooDotCom)
			headerIs(p, PH.AccessControlAllowMethods, 'GET')
			headerIs(p, PH.AccessControlAllowCredentials, 'true')
			headerIs(p, PH.AccessControlAllowHeaders, 'content-type,my-header')
		})
	})

	// TODO Actual request response headers
})
