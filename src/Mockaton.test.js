import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { equal, deepEqual, match } from 'node:assert/strict'
import { describe, it, before, beforeEach, after } from 'node:test'
import { writeFileSync, mkdtempSync, mkdirSync, unlinkSync, readFileSync } from 'node:fs'

import { logger } from './utils/logger.js'
import { mimeFor } from './utils/mime.js'
import { Mockaton } from './Mockaton.js'
import { readBody } from './utils/http-request.js'
import { Commander } from './ApiCommander.js'
import { CorsHeader } from './utils/http-cors.js'
import { parseFilename } from './Filename.js'
import { API, DEFAULT_MOCK_COMMENT } from './ApiConstants.js'


// On CI, we need those extra paths, otherwise it mkdtemp throws
const mocksDir = mkdtempSync(tmpdir() + '/mocks') + '/'
const staticDir = mkdtempSync(tmpdir() + '/static') + '/'


function write(filename, data) { _write(mocksDir + filename, data) }
function _write(absPath, data) {
	mkdirSync(dirname(absPath), { recursive: true })
	writeFileSync(absPath, data, 'utf8')
}

async function register(file, data) {
	write(file, data)
	await sleep()
}

async function unregister(file) {
	unlinkSync(mocksDir + file)
	await sleep()
}

async function sleep(ms = 50) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

function spyLogger(t, method) {
	const spy = t.mock.method(logger, method)
	spy.mock.mockImplementation(() => null)
	return spy.mock
}

class Fixture {
	constructor(file, body = '') {
		const { urlMask, method, status, ext } = parseFilename(file)
		this.file = file
		this.urlMask = urlMask
		this.method = method
		this.status = status
		this.ext = ext
		this.body = body || `Body for ${file}`
	}
	
	static async create(file, body) {
		const fx = new Fixture(file, body)
		await fx.register()
		return fx
	}

	request(options = {}) {
		return request(this.urlMask, options)
	}

	async register() {
		write(this.file, this.body)
		await sleep()
	}
}

class FixtureStatic {
	constructor(file, body = '') {
		this.file = file
		this.urlMask = '/' + file
		this.method = 'GET'
		this.status = 200
		this.body = body || `Body for static ${file}`
	}
	
	static async create(file, body) {
		const fx = new FixtureStatic(file, body)
		await fx.register()
		return fx
	}

	request(options = {}) {
		return request(this.urlMask, options)
	}

	async register() {
		_write(staticDir + this.file, this.body)
		await sleep()
	}

	async unregister() {
		unlinkSync(staticDir + this.file)
		await sleep()
	}
}


/** # Fixtures */

// TODO Refactor
const fixtures = [
	[
		'/api',
		'api/.GET.200.json',
		'index-like route for /api, which could just be the extension convention'
	],

	// Exact route paths
	[
		'/api/the-mime',
		'api/the-mime.GET.200.txt',
		'determines the content type'
	], [
		'/api/the-method-and-status',
		'api/the-method-and-status.POST.201.json',
		'obeys the HTTP method and response status'
	], [
		'/api/the-comment',
		'api/the-comment(this is the actual comment).GET.200(another comment).txt',
		''
	], [
		'/api/alternative',
		'api/alternative(comment-1).GET.200.json',
		'With_Comment_1'
	], [
		'/api/dot.in.path',
		'api/dot.in.path.GET.200.json',
		'Dot_in_Path'
	], [
		'/api/space & colon:',
		'api/space & colon:.GET.200.json',
		'Decodes URI'
	],

	[
		'/api/uncommon-method',
		'/api/uncommon-method.ACL.200.json',
		'node.js doesn’t support arbitrary HTTP methods, but it does support a few non-standard ones'
	],


	// Dynamic Params
	[
		'/api/user/1234',
		'api/user/[id]/.GET.200.json',
		'variable at end'
	], [
		'/api/user/1234/suffix',
		'api/user/[id]/suffix.GET.200.json',
		'sandwich a variable that another route has at the end'
	], [
		'/api/user/exact-route',
		'api/user/exact-route.GET.200.json',
		'ensure dynamic params do not take precedence over exact routes'
	],

	// Query String
	// TODO ignore on Windows (because of ?)
	[
		'/api/my-query-string?foo=[foo]&bar=[bar]',
		'api/my-query-string?foo=[foo]&bar=[bar].GET.200.json',
		'two query string params'
	], [
		'/api/company-a',
		'api/company-a/[id]?limit=[limit].GET.200.json',
		'without pretty-param nor query-params'
	], [
		'/api/company-b/',
		'api/company-b/[id]?limit=[limit].GET.200.json',
		'without pretty-param nor query-params with trailing slash'
	], [
		'/api/company-c/1234',
		'api/company-c/[id]?limit=[limit].GET.200.json',
		'with pretty-param and without query-params'
	], [
		'/api/company-d/1234/?',
		'api/company-d/[id]?limit=[limit].GET.200.json',
		'with pretty-param and without query-params, but with trailing slash and "?"'
	], [
		'/api/company-e/1234/?limit=4',
		'api/company-e/[id]?limit=[limit].GET.200.json',
		'with pretty-param and query-params'
	],
]

const fixtureA = await Fixture.create('basic.GET.200.json')


for (const [, file, body] of fixtures)
	write(file, file.endsWith('.json') ? JSON.stringify(body) : body)

write('api/.GET.500.txt', 'keeps non-autogenerated 500')
write('api/alternative(comment-2).GET.200.json', JSON.stringify({ comment: 2 }))
write('api/my-route(comment-2).GET.200.json', JSON.stringify({ comment: 2 }))

// JavaScript to JSON (params for testing URL decoding)
write('/api/object?param=[param].GET.200.js', 'export default { JSON_FROM_JS: true }')


const COOKIES = { userA: 'CookieA', userB: 'CookieB' }
const CUSTOM_EXT = 'custom_extension'
const CUSTOM_MIME = 'custom_mime'
const ALLOWED_ORIGIN = 'http://example.com'

const server = await Mockaton({
	mocksDir,
	staticDir,
	onReady() {},
	cookies: COOKIES,
	extraHeaders: ['Server', 'MockatonTester'],
	extraMimes: { [CUSTOM_EXT]: CUSTOM_MIME },
	logLevel: 'quiet',
	corsOrigins: [ALLOWED_ORIGIN],
	corsExposedHeaders: ['Content-Encoding']
})
const mockatonAddr = `http://${server.address().address}:${server.address().port}`
const commander = new Commander(mockatonAddr)

function request(path, options = {}) {
	return fetch(mockatonAddr + path, options)
}

/** @returns {Promise<State>} */
async function fetchState() {
	return await (await commander.getState()).json()
}


beforeEach(async () => await commander.reset())


describe('Error Handling', () => {
	it('ignores invalid filenames and warns', async t => {
		const spy = spyLogger(t, 'warn')
		const files = [
			'missing-method-and-status.json',
			'foo._INVALID_METHOD_.200.json',
			'bar.GET._INVALID_STATUS_.json'
		]
		for (const f of files)
			await register(f, '')
		equal(spy.calls[0].arguments[0], 'Invalid Filename Convention')
		equal(spy.calls[1].arguments[0], 'Unrecognized HTTP Method: "_INVALID_METHOD_"')
		equal(spy.calls[2].arguments[0], 'Invalid HTTP Response Status: "NaN"')
		for (const f of files)
			await unregister(f)
	})

	describe('Rejects malicious URLs', () => [
		['double-encoded', `/${encodeURIComponent(encodeURIComponent('/'))}user`, 400],
		['encoded null byte', '/user%00/admin', 400],
		['invalid percent-encoding', '/user%ZZ', 400],
		['encoded CRLF sequence', '/user%0d%0aSet-Cookie:%20x=1', 400],
		['overlong/illegal UTF-8 sequence', '/user%C0%AF', 400],
		['double-double-encoding trick', '/%25252Fuser', 400],
		['zero-width/invisible char', '/user%E2%80%8Binfo', 404],
		['encoded path traversal', '/user/..%2Fadmin', 404],
		['raw path traversal', '/../user', 404],

		['very long path', '/'.repeat(2048 + 1), 414]
	]
		.map(([title, url, status]) =>
			it(title, async () =>
				equal((await request(url)).status, status))))

	it('body parser rejects invalid JSON in API requests', async t => {
		const spy = spyLogger(t, 'access')
		equal((await request(API.cookies, {
			method: 'PATCH',
			body: '[invalid_json]'
		})).status, 422)
		equal(spy.calls[0].arguments[1], 'BodyReaderError: Could not parse')
	})

	it('returns 500 when a handler throws', async t => {
		const spy = spyLogger(t, 'error')
		equal((await request(API.throws)).status, 500)
		equal(spy.calls[0].arguments[2], 'Test500')
	})
	
	it('on Windows, path separators are normalized to forward slashes', async () => {
		const { brokersByMethod } = await fetchState()
		equal(brokersByMethod[fixtureA.method][fixtureA.urlMask].file, fixtureA.file)
	})
})

describe('CORS', () => {
	describe('Set CORS allowed', () => {
		it('422 for non boolean', async () => {
			const res = await commander.setCorsAllowed('not-a-boolean')
			equal(res.status, 422)
			equal(await res.text(), 'Expected boolean for "corsAllowed"')
		})

		it('200', async () => {
			const res = await commander.setCorsAllowed(true)
			equal(res.status, 200)
			equal((await fetchState()).corsAllowed, true)

			await commander.setCorsAllowed(false)
			equal((await fetchState()).corsAllowed, false)
		})
	})

	it('preflights', async () => {
		await commander.setCorsAllowed(true)
		const res = await request('/does-not-matter', {
			method: 'OPTIONS',
			headers: {
				[CorsHeader.Origin]: ALLOWED_ORIGIN,
				[CorsHeader.AcRequestMethod]: 'GET'
			}
		})
		equal(res.status, 204)
		equal(res.headers.get(CorsHeader.AcAllowOrigin), ALLOWED_ORIGIN)
		equal(res.headers.get(CorsHeader.AcAllowMethods), 'GET')
	})

	it('responds', async () => {
		const res = await fixtureA.request({
			headers: {
				[CorsHeader.Origin]: ALLOWED_ORIGIN
			}
		})
		equal(res.status, 200)
		equal(res.headers.get(CorsHeader.AcAllowOrigin), ALLOWED_ORIGIN)
		equal(res.headers.get(CorsHeader.AcExposeHeaders), 'Content-Encoding')
	})
})

describe('Dashboard', () => {
	it('renders', async () => {
		const res = await request(API.dashboard)
		match(await res.text(), new RegExp('<!DOCTYPE html>'))
	})

	it('query string is accepted', async () => {
		const res = await request(API.dashboard + '?foo=bar')
		match(await res.text(), new RegExp('<!DOCTYPE html>'))
	})

	describe('getSyncVersion', () => {
		let version

		it('getSyncVersion responds immediately when version mismatches', async () => {
			const res = await commander.getSyncVersion(-1)
			version = await res.json()
		})

		const file1 = 'runtime1.GET.200.txt'
		const file2 = 'runtime2.GET.200.txt'
		it('responds debounced when files are added (bulk additions count as 1 increment)', async () => {
			const prom = commander.getSyncVersion(version)
			await register(file1, '')
			await register(file2, '')
			equal(await (await prom).json(), version + 1)
		})

		it('responds debounced when files are deleted', async () => {
			const prom = commander.getSyncVersion(version + 1)
			await unregister(file1)
			await unregister(file2)
			equal(await (await prom).json(), version + 2)
		})
	})
})


describe('Cookie', () => {
	it('422 when trying to select non-existing cookie', async () =>
		equal((await commander.selectCookie('non-existing-cookie-key')).status, 422))

	it('defaults to the first key:value', async () =>
		deepEqual((await fetchState()).cookies, [
			['userA', true],
			['userB', false]
		]))

	it('updates selected cookie', async () => {
		const resA = await fixtureA.request()
		equal(resA.headers.get('set-cookie'), {
			mocksDir,
			staticDir,
			onReady() {},
			cookies: COOKIES,
			extraHeaders: ['Server', 'MockatonTester'],
			extraMimes: {
				[CUSTOM_EXT]: CUSTOM_MIME
			},
			logLevel: 'quiet',
			corsOrigins: [ALLOWED_ORIGIN],
			corsExposedHeaders: ['Content-Encoding']
		}.cookies.userA)

		const response = await commander.selectCookie('userB')
		deepEqual(await response.json(), [
			['userA', false],
			['userB', true]
		])

		const resB = await fixtureA.request()
		equal(resB.headers.get('set-cookie'), {
			mocksDir,
			staticDir,
			onReady() {},
			cookies: COOKIES,
			extraHeaders: ['Server', 'MockatonTester'],
			extraMimes: {
				[CUSTOM_EXT]: CUSTOM_MIME
			},
			logLevel: 'quiet',
			corsOrigins: [ALLOWED_ORIGIN],
			corsExposedHeaders: ['Content-Encoding']
		}.cookies.userB)
	})
})

describe('Delay', () => {
	describe('Set Global Delay', () => {
		it('422 for invalid global delay value', async () => {
			const res = await commander.setGlobalDelay('not-a-number')
			equal(res.status, 422)
			equal(await res.text(), 'Expected non-negative integer for "delay"')
		})
		it('200 for valid global delay value', async () => {
			const res = await commander.setGlobalDelay(150)
			equal(res.status, 200)
			equal((await fetchState()).delay, 150)
		})
	})

	it('updates route delay', async () => {
		const delay = 120
		await commander.setGlobalDelay(delay)
		await commander.setRouteIsDelayed(fixtureA.method, fixtureA.urlMask, true)
		const now = new Date()
		const res = await fixtureA.request()
		equal(await res.text(), fixtureA.body)
		equal((new Date()).getTime() - now.getTime() > delay, true)
	})

	it('422 when updating non-existing mock alternative. There are mocks for /alpha but not for this one', async () => {
		const missingFile = 'alpha(non-existing-variant).GET.200.json'
		const res = await commander.select(missingFile)
		equal(res.status, 422)
		equal(await res.text(), `Missing Mock: ${missingFile}`)
	})

	describe('Set Route is Delayed', () => {
		it('422 for non-existing route', async () => {
			const res = await commander.setRouteIsDelayed('GET', '/non-existing', true)
			equal(res.status, 422)
			equal(await res.text(), `Route does not exist: GET /non-existing`)
		})
		it('422 for invalid delayed value', async () => {
			const res = await commander.setRouteIsDelayed(fixtureA.method, fixtureA.urlMask, 'not-a-boolean')
			equal(await res.text(), 'Expected boolean for "delayed"')
		})
		it('200', async () => {
			const res = await commander.setRouteIsDelayed(fixtureA.method, fixtureA.urlMask, true)
			equal((await res.json()).delayed, true)
		})
	})

})

describe('Proxy Fallback', () => {
	describe('Fallback', () => {
		let fallbackServer
		before(async () => {
			fallbackServer = createServer(async (req, response) => {
				response.writeHead(423, {
					'custom_header': 'my_custom_header',
					'content-type': mimeFor('.txt'),
					'set-cookie': [
						'cookieA=A',
						'cookieB=B'
					]
				})
				response.end(await readBody(req)) // echoes they req body payload
			})
			await promisify(fallbackServer.listen).bind(fallbackServer, 0, '127.0.0.1')()
			await commander.setProxyFallback(`http://localhost:${fallbackServer.address().port}`)
			await commander.setCollectProxied(true)
		})

		after(() => fallbackServer.close())

		it('Relays to fallback server and saves the mock', async () => {
			const reqBodyPayload = 'text_req_body'

			const res = await request(`/api/non-existing-mock/${randomUUID()}`, {
				method: 'POST',
				body: reqBodyPayload
			})
			equal(res.status, 423)
			equal(res.headers.get('custom_header'), 'my_custom_header')
			equal(res.headers.get('set-cookie'), ['cookieA=A', 'cookieB=B'].join(', '))
			equal(await res.text(), reqBodyPayload)

			const savedBody = readFileSync(join(mocksDir, 'api/non-existing-mock/[id].POST.423.txt'), 'utf8')
			equal(savedBody, reqBodyPayload)
		})
	})

	describe('Set Proxy Fallback', () => {
		it('422 when value is not a valid URL', async () => {
			const res = await commander.setProxyFallback('bad url')
			equal(res.status, 422)
			equal(await res.text(), 'Invalid Proxy Fallback URL')
		})

		it('sets fallback', async () => {
			const res = await commander.setProxyFallback('http://example.com')
			equal(res.status, 200)
			equal((await fetchState()).proxyFallback, 'http://example.com')
		})

		it('unsets fallback', async () => {
			const res = await commander.setProxyFallback('')
			equal(res.status, 200)
			equal((await fetchState()).proxyFallback, '')
		})
	})

	describe('Set Collect Proxied', () => {
		it('422 for invalid collectProxied value', async () => {
			const res = await commander.setCollectProxied('not-a-boolean')
			equal(res.status, 422)
			equal(await res.text(), 'Expected a boolean for "collectProxied"')
		})

		it('200 set and unset', async () => {
			await commander.setCollectProxied(true)
			equal((await fetchState()).collectProxied, true)

			await commander.setCollectProxied(false)
			equal((await fetchState()).collectProxied, false)
		})
	})

	describe('Set Route is Proxied', () => {
		beforeEach(async () => await commander.setProxyFallback(''))
		after(async () => await commander.setProxyFallback(''))

		it('422 for non-existing route', async () => {
			const res = await commander.setRouteIsProxied('GET', '/non-existing', true)
			equal(res.status, 422)
			equal(await res.text(), `Route does not exist: GET /non-existing`)
		})

		it('422 for invalid proxied value', async () => {
			const res = await commander.setRouteIsProxied(fixtureA.method, fixtureA.urlMask, 'not-a-boolean')
			equal(res.status, 422)
			equal(await res.text(), 'Expected boolean for "proxied"')
		})

		it('422 for missing proxy fallback', async () => {
			const res = await commander.setRouteIsProxied(fixtureA.method, fixtureA.urlMask, true)
			equal(res.status, 422)
			equal(await res.text(), `There’s no proxy fallback`)
		})

		it('200 when setting', async () => {
			await commander.setProxyFallback('https://example.com')
			const res = await commander.setRouteIsProxied(fixtureA.method, fixtureA.urlMask, true)
			equal(res.status, 200)
			equal((await res.json()).proxied, true)

			const res2 = await commander.setRouteIsProxied(fixtureA.method, fixtureA.urlMask, false)
			equal(res2.status, 200)
			equal((await res2.json()).proxied, false)
		})

		it('200 when unsetting', async () => {
			const res = await commander.setRouteIsProxied(fixtureA.method, fixtureA.urlMask, false)
			equal(res.status, 200)
			equal((await res.json()).proxied, false)
		})
	})

	it('updates current selected mock and resets proxied flag', async () => {
		const url = '/api/alternative'
		const file = 'api/alternative(comment-2).GET.200.json'
		const expectedBody = JSON.stringify({ comment: 2 })
		await commander.setRouteIsProxied('GET', url, true)
		const r0 = await commander.select(file)
		deepEqual(await r0.json(), {
			file,
			status: 200,
			auto500: false,
			delayed: false,
			proxied: false,
			mocks: [
				'api/alternative(comment-1).GET.200.json',
				'api/alternative(comment-2).GET.200.json',
			]
		})
		const res = await request(url)
		equal(res.status, 200)
		equal(await res.text(), expectedBody)
	})
})

describe('Comments', () => {
	it('extracts all comments without duplicates', async () => {
		deepEqual((await fetchState()).comments, [
			DEFAULT_MOCK_COMMENT,
			'(comment-1)',
			'(comment-2)',
			'(this is the actual comment)',
			'(another comment)'
		])
	})

	describe('selects exact', async () => {
		beforeEach(async () => {
			await commander.bulkSelectByComment('(comment-2)')
		})
		const tests = [
			['/api/alternative', 'api/alternative(comment-2).GET.200.json', { comment: 2 }],
			['/api/my-route', 'api/my-route(comment-2).GET.200.json', { comment: 2 }]
		]
		for (const [url, file, body] of tests) {
			await it(`url: ${url}`, async () => {
				const { method } = parseFilename(file)
				const res = await request(url, { method })
				deepEqual(await res.json(), body)
			})
		}
	})

	describe('selects partial', async () => {
		beforeEach(async () => {
			await commander.bulkSelectByComment('(mment-1)')
		})
		const tests = [
			['/api/alternative', 'api/alternative(comment-1).GET.200.json', 'With_Comment_1']
		]
		for (const [url, file, body] of tests) {
			await it(`url: ${url}`, async () => {
				const { method } = parseFilename(file)
				const res = await request(url, { method })
				deepEqual(await res.json(), body)
			})
		}
	})
})

describe('Auto 500', () => {
	it('preserves existing 500', async () => {
		const url = '/api'
		const file = 'api/.GET.500.txt'
		const expectedBody = 'keeps non-autogenerated 500'
		await commander.select(file)
		const res = await request(url)
		equal(res.status, 500)
		equal(await res.text(), expectedBody)
	})

	it('toggles 500', async () => {
		equal((await fixtureA.request()).status, fixtureA.status)

		const r0 = await commander.toggle500(fixtureA.method, fixtureA.urlMask)
		equal((await r0.json()).auto500, true)
		equal((await fixtureA.request()).status, 500)

		const r1 = await commander.toggle500(fixtureA.method, fixtureA.urlMask)
		equal((await r1.json()).auto500, false)
		equal((await fixtureA.request()).status, fixtureA.status)
	})
})

describe('404', () => {
	it('when there’s no mock', async () =>
		equal((await request('/non-existing')).status, 404))

	it('when there’s no mock at all for a method', async () =>
		equal((await request('/non-existing-too', { method: 'DELETE' })).status, 404))

	it('ignores files ending in ~ by default, e.g. JetBrains temp files', async () => {
		const fx = await Fixture.create('ignored.GET.200.json~')
		return equal((await fx.request()).status, 404)
	})

	it('ignores static files ending in ~', async () => {
		const fx = await FixtureStatic.create('static/ignored.js~')
		return equal((await fx.request()).status, 404)
	})
})

describe('Default mock', async () => {
	const fxA = await Fixture.create('alpha.GET.200.txt', 'A')
	const fxB = await Fixture.create('alpha(default).GET.200.txt', 'B')

	await it('sorts mocks list with the user specified default first for dashboard display', async () => {
		const { mocks } = (await fetchState()).brokersByMethod.GET[fxA.urlMask]
		deepEqual(mocks, [
			fxB.file,
			fxA.file
		])
	})
	await it('Dispatches default mock', async () => {
		const res = await fxA.request()
		deepEqual(await res.text(), fxB.body)
	})
})

describe('JS Function Mocks', () => {
	it('honors filename convention', async () => {
		await register('api/js-func.GET.200.js', `
export default function (req, response) {
  return 'SOME_STRING_0'
}`)
		const res = await request('/api/js-func')
		equal(res.status, 200)
		equal(res.headers.get('content-type'), mimeFor('.json'))
		equal(res.headers.get('content-type'), mimeFor('.json'))
		equal(res.headers.get('set-cookie'), 'CookieA')
		equal(await res.text(), 'SOME_STRING_0')
	})

	it('can override filename convention', async () => {
		await register('api/js-func.POST.200.js', `
export default function (req, response) {
  response.statusCode = 201
  response.setHeader('content-type', 'custom-mime')
  response.setHeader('set-cookie', 'custom-cookie')
  return 'SOME_STRING_1'
}`)
		const res = await request('/api/js-func', { method: 'POST' })
		equal(res.status, 201)
		equal(res.headers.get('content-type'), 'custom-mime')
		equal(res.headers.get('set-cookie'), 'custom-cookie')
		equal(await res.text(), 'SOME_STRING_1')
	})
})

describe('Static Files', () => {
	let fxIndex, fxAsset
	before(async () => {
		fxIndex = await FixtureStatic.create('static/index.html', '<h1>Index</h1>')
		fxAsset = await FixtureStatic.create('static/assets/script.js', 'const a = 1')
	})

	describe('Static File Serving', () => {
		it('Defaults to index.html', async () => {
			const res = await request('/static')
			equal(res.status, 200)
			equal(res.headers.get('content-type'), mimeFor(fxIndex.file))
			equal(await res.text(), fxIndex.body)
		})

		it('Serves exacts paths', async () => {
			const res = await fxAsset.request()
			equal(res.status, 200)
			equal(res.headers.get('content-type'), mimeFor(fxAsset.file))
			equal(await res.text(), fxAsset.body)
		})
	})

	it('Static File List', async () => {
		const { staticBrokers } = await fetchState()
		deepEqual(Object.keys(staticBrokers), [
			fxAsset.urlMask,
			fxIndex.urlMask
		])
	})

	describe('Set Static Route is Delayed', () => {
		it('422 for non-existing route', async () => {
			const res = await commander.setStaticRouteIsDelayed('/non-existing', true)
			equal(res.status, 422)
			equal(await res.text(), `Static route does not exist: /non-existing`)
		})

		it('422 for invalid delayed value', async () => {
			const res = await commander.setStaticRouteIsDelayed(fxIndex.urlMask, 'not-a-boolean')
			equal(await res.text(), 'Expected boolean for "delayed"')
		})

		it('200', async () => {
			await commander.setStaticRouteIsDelayed(fxIndex.urlMask, true)
			const { staticBrokers } = await fetchState()
			equal(staticBrokers[fxIndex.urlMask].delayed, true)
		})
	})

	describe('Set Static Route Status Code', () => {
		it('422 for non-existing route', async () => {
			const res = await commander.setStaticRouteStatus('/non-existing', 200)
			equal(res.status, 422)
			equal(await res.text(), `Static route does not exist: /non-existing`)
		})

		it('422 for invalid delayed value', async () => {
			const res = await commander.setStaticRouteStatus(fxIndex.urlMask, 'not-200-or-404')
			equal(res.status, 422)
			equal(await res.text(), 'Expected 200 or 404 status code')
		})

		it('200', async () => {
			const res = await commander.setStaticRouteStatus(fxIndex.urlMask, 404)
			equal(res.status, 200)
			const { staticBrokers } = await fetchState()
			equal(staticBrokers[fxIndex.urlMask].status, 404)
		})
	})

	describe('Resets Static Routes', () => {
		beforeEach(async () => {
			await commander.setStaticRouteIsDelayed(fxIndex.urlMask, true)
			await commander.setStaticRouteStatus(fxIndex.urlMask, 404)
			await commander.reset()
		})

		it('resets delayed', async () => {
			const { staticBrokers } = await fetchState()
			equal(staticBrokers[fxIndex.urlMask].delayed, false)
		})

		it('resets status', async () => {
			const { staticBrokers } = await fetchState()
			equal(staticBrokers[fxIndex.urlMask].status, 200)
		})
	})

	describe('Static Partial Content', () => {
		it('206 serves partial content', async () => {
			const res1 = await fxIndex.request({ headers: { range: 'bytes=0-3' } })
			const res2 = await fxIndex.request({ headers: { range: 'bytes=4-' } })
			equal(res1.status, 206)
			equal(res2.status, 206)
			const body = await res1.text() + await res2.text()
			equal(body, fxIndex.body)
		})

		it('416 on invalid range (end > start)', async () => {
			const res = await fxIndex.request({ headers: { range: 'bytes=3-0' } })
			equal(res.status, 416)
		})
	})

	it('unregisters static route', async () => {
		await fxIndex.unregister()
		const { staticBrokers } = await fetchState()
		equal(staticBrokers[fxIndex.urlMask], undefined)
	})

})


describe('Registering', () => {
	const fxPutA = [
		'/api/register',
		'api/register(a).PUT.200.json',
		'fixture_for_registering_a'
	]
	const fxPutB = [
		'/api/register',
		'api/register(b).PUT.200.json',
		'fixture_for_registering_b'
	]
	const fxPutA500 = [
		'/api/register',
		'api/register.PUT.500.json',
		'fixture_for_registering_500'
	]
	const fxPutC = [
		'/api/unregister',
		'api/unregister.PUT.200.json',
		'fixture_for_unregistering'
	]

	it('registering new route creates temp 500 as well and re-registering is a noop', async () => {
		await register(fxPutA[1], '')
		await register(fxPutA[1], '')
		await register(fxPutB[1], '')
		const { brokersByMethod } = await fetchState()
		deepEqual(brokersByMethod.PUT[fxPutA[0]].mocks, [
			fxPutA[1],
			fxPutB[1],
		])
	})

	it('registering a 500 unsets auto500', async () => {
		const new500 = `api/register.PUT.500.empty`
		await commander.select(new500)
		await register(fxPutA500[1], '')
		const { brokersByMethod } = await fetchState()
		const b = brokersByMethod.PUT[fxPutA[0]]
		deepEqual(b, {
			file: fxPutA[1],
			status: 200,
			auto500: false,
			delayed: false,
			proxied: false,
			mocks: [
				fxPutA[1],
				fxPutB[1],
				fxPutA500[1]
			]
		})
	})

	it('unregisters selected', async () => {
		await commander.select(fxPutA[1])
		await unregister(fxPutA[1])
		const { brokersByMethod } = await fetchState()
		const b = brokersByMethod.PUT[fxPutA[0]]
		deepEqual(b, {
			file: fxPutB[1],
			status: 200,
			auto500: false,
			delayed: false,
			proxied: false,
			mocks: [
				fxPutB[1],
				fxPutA500[1]
			]
		})
	})

	it('unregistering the last mock removes broker', async () => {
		await register(fxPutC[1], '') // Register another PUT so it doesn't delete PUT from collection
		await unregister(fxPutC[1])
		const { brokersByMethod } = await fetchState()
		equal(brokersByMethod.PUT[fxPutC[0]], undefined)
	})

	it('unregistering the last PUT mock removes PUT from collection', async () => {
		await unregister(fxPutB[1])
		await unregister(fxPutA500[1])
		const { brokersByMethod } = await fetchState()
		equal(brokersByMethod.PUT, undefined)
	})
})

describe('Dispatch', () => {
	function testMockDispatching(url, file, expectedBody, forcedMime = undefined) {
		it('URL Mask: ' + file, async () => {
			const { method, status } = parseFilename(file)
			const mime = forcedMime || mimeFor(file)
			const res = await request(url, { method })
			const body = mime === 'application/json'
				? await res.json()
				: await res.text()
			equal(res.status, status)
			equal(res.headers.get('content-type'), mime)
			equal(res.headers.get('set-cookie'), 'CookieA')
			equal(res.headers.get('server'), 'MockatonTester')
			deepEqual(body, expectedBody)
		})
	}

	for (const [url, file, body] of fixtures)
		testMockDispatching(url, file, body)

	testMockDispatching('/api/object', 'api/object.GET.200.js', { JSON_FROM_JS: true }, mimeFor('.json'))

	it('assigns custom mimes derived from extension', async () => {
		const fx = await Fixture.create(`custom-extension.GET.200.${CUSTOM_EXT}`)
		const res = await fx.request()
		equal(res.headers.get('content-type'), CUSTOM_MIME)
	})
})

await it('head for get. returns the headers without body only for GETs requested as HEAD', async () => {
	const res = await fixtureA.request({ method: 'HEAD' })
	equal(res.status, 200)
	equal(res.headers.get('content-length'), String(Buffer.byteLength(fixtureA.body)))
	equal(await res.text(), '')
})

server?.close()

