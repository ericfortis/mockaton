import { equal } from 'node:assert/strict'
import { promisify } from 'node:util'
import { createServer } from 'node:http'
import { describe, test, after } from 'node:test'
import { isPreflight, setCorsHeaders, CorsHeader as CH } from './http-cors.js'


function headerIs(response, header, value) {
	equal(response.headers.get(header), value)
}

const FooDotCom = 'http://foo.com'
const AllowedDotCom = 'http://allowed.com'
const NotAllowedDotCom = 'http://not-allowed.com'

await describe('CORS', async () => {
	let corsConfig = {}

	const server = createServer((req, response) => {
		setCorsHeaders(req, response, corsConfig)
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
			[CH.Origin]: 'http://localhost:9999',
			[CH.AcRequestMethod]: 'POST'
		}

		await test('Ignores non-OPTIONS requests', async () => {
			const res = await request(requiredRequestHeaders, 'POST')
			equal(await res.text(), 'NON_PREFLIGHT')
		})

		await test(`Ignores non-parseable req ${CH.Origin} header`, async () => {
			const headers = {
				...requiredRequestHeaders,
				[CH.Origin]: 'non-url'
			}
			const res = await preflight(headers)
			equal(await res.text(), 'NON_PREFLIGHT')
		})

		await test(`Ignores missing method in ${CH.AcRequestMethod} header`, async () => {
			const headers = { ...requiredRequestHeaders }
			delete headers[CH.AcRequestMethod]
			const res = await preflight(headers)
			equal(await res.text(), 'NON_PREFLIGHT')
		})

		await test(`Ignores non-standard method in ${CH.AcRequestMethod} header`, async () => {
			const headers = {
				...requiredRequestHeaders,
				[CH.AcRequestMethod]: 'NON_STANDARD'
			}
			const res = await preflight(headers)
			equal(await res.text(), 'NON_PREFLIGHT')
		})

		await test('204 valid preflights', async () => {
			const res = await preflight(requiredRequestHeaders)
			equal(res.status, 204)
		})
	})

	await describe('Preflight Response Headers', async () => {
		await test('no origins allowed', async () => {
			corsConfig = {
				corsOrigins: [],
				corsMethods: ['GET']
			}
			const p = await preflight({
				[CH.Origin]: FooDotCom,
				[CH.AcRequestMethod]: 'GET'
			})
			headerIs(p, CH.AcAllowOrigin, null)
			headerIs(p, CH.AcAllowMethods, null)
			headerIs(p, CH.AcAllowCredentials, null)
			headerIs(p, CH.AcAllowHeaders, null)
			headerIs(p, CH.AcMaxAge, null)
		})

		await test('not in allowed origins', async () => {
			corsConfig = {
				corsOrigins: [AllowedDotCom],
				corsMethods: ['GET']
			}
			const p = await preflight({
				[CH.Origin]: NotAllowedDotCom,
				[CH.AcRequestMethod]: 'GET'
			})
			headerIs(p, CH.AcAllowOrigin, null)
			headerIs(p, CH.AcAllowMethods, null)
			headerIs(p, CH.AcAllowCredentials, null)
			headerIs(p, CH.AcAllowHeaders, null)
		})

		await test('origin and method match', async () => {
			corsConfig = {
				corsOrigins: [AllowedDotCom],
				corsMethods: ['GET']
			}
			const p = await preflight({
				[CH.Origin]: AllowedDotCom,
				[CH.AcRequestMethod]: 'GET'
			})
			headerIs(p, CH.AcAllowOrigin, AllowedDotCom)
			headerIs(p, CH.AcAllowMethods, 'GET')
			headerIs(p, CH.AcAllowCredentials, null)
			headerIs(p, CH.AcAllowHeaders, null)
		})

		await test('origin matches from multiple', async () => {
			corsConfig = {
				corsOrigins: [AllowedDotCom, FooDotCom],
				corsMethods: ['GET']
			}
			const p = await preflight({
				[CH.Origin]: AllowedDotCom,
				[CH.AcRequestMethod]: 'GET'
			})
			headerIs(p, CH.AcAllowOrigin, AllowedDotCom)
			headerIs(p, CH.AcAllowMethods, 'GET')
			headerIs(p, CH.AcAllowCredentials, null)
			headerIs(p, CH.AcAllowHeaders, null)
		})

		await test('wildcard origin', async () => {
			corsConfig = {
				corsOrigins: ['*'],
				corsMethods: ['GET']
			}
			const p = await preflight({
				[CH.Origin]: FooDotCom,
				[CH.AcRequestMethod]: 'GET'
			})
			headerIs(p, CH.AcAllowOrigin, FooDotCom)
			headerIs(p, CH.AcAllowMethods, 'GET')
			headerIs(p, CH.AcAllowCredentials, null)
			headerIs(p, CH.AcAllowHeaders, null)
		})

		await test(`wildcard and credentials`, async () => {
			corsConfig = {
				corsOrigins: ['*'],
				corsMethods: ['GET'],
				corsCredentials: true
			}
			const p = await preflight({
				[CH.Origin]: FooDotCom,
				[CH.AcRequestMethod]: 'GET'
			})
			headerIs(p, CH.AcAllowOrigin, FooDotCom)
			headerIs(p, CH.AcAllowMethods, 'GET')
			headerIs(p, CH.AcAllowCredentials, 'true')
			headerIs(p, CH.AcAllowHeaders, null)
		})

		await test(`wildcard, credentials, and headers`, async () => {
			corsConfig = {
				corsOrigins: ['*'],
				corsMethods: ['GET'],
				corsCredentials: true,
				corsHeaders: ['content-type', 'my-header']
			}
			const p = await preflight({
				[CH.Origin]: FooDotCom,
				[CH.AcRequestMethod]: 'GET'
			})
			headerIs(p, CH.AcAllowOrigin, FooDotCom)
			headerIs(p, CH.AcAllowMethods, 'GET')
			headerIs(p, CH.AcAllowCredentials, 'true')
			headerIs(p, CH.AcAllowHeaders, 'content-type,my-header')
		})
	})

	await describe('Non-Preflight (Actual Response) Headers', async () => {
		await test('no origins allowed', async () => {
			corsConfig = {
				corsOrigins: [],
				corsMethods: ['GET']
			}
			const p = await request({
				[CH.Origin]: NotAllowedDotCom
			})
			equal(p.status, 200)
			headerIs(p, CH.AcAllowOrigin, null)
			headerIs(p, CH.AcAllowCredentials, null)
			headerIs(p, CH.AcExposeHeaders, null)
		})

		await test('origin allowed', async () => {
			corsConfig = {
				corsOrigins: [AllowedDotCom],
				corsMethods: ['GET'],
				corsCredentials: true,
				corsExposedHeaders: ['x-h1', 'x-h2']
			}
			const p = await request({
				[CH.Origin]: AllowedDotCom
			})
			equal(p.status, 200)
			headerIs(p, CH.AcAllowOrigin, AllowedDotCom)
			headerIs(p, CH.AcAllowCredentials, 'true')
			headerIs(p, CH.AcExposeHeaders, 'x-h1,x-h2')
		})
	})
})
