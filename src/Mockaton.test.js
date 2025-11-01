import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { equal, deepEqual, match } from 'node:assert/strict'
import { describe, it, before, beforeEach, after } from 'node:test'
import { writeFileSync, mkdtempSync, mkdirSync, unlinkSync, readFileSync } from 'node:fs'

import { API } from './ApiConstants.js'
import { logger } from './utils/logger.js'
import { mimeFor } from './utils/mime.js'
import { Mockaton } from './Mockaton.js'
import { readBody } from './utils/http-request.js'
import { Commander } from './ApiCommander.js'
import { CorsHeader } from './utils/http-cors.js'
import { parseFilename } from './Filename.js'


// On CI, we need those extra paths, otherwise it mkdtemp throws
const mocksDir = mkdtempSync(tmpdir() + '/mocks') + '/'
const staticDir = mkdtempSync(tmpdir() + '/static') + '/'


function write(filename, data) { _write(mocksDir + filename, data) }
function _write(absPath, data) {
	mkdirSync(dirname(absPath), { recursive: true })
	writeFileSync(absPath, data, 'utf8')
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

	async unregister() {
		unlinkSync(mocksDir + this.file)
		await sleep()
	}

	async fetchBroker() {
		return (await fetchState()).brokersByMethod?.[this.method]?.[this.urlMask]
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
		const fxs = new FixtureStatic(file, body)
		await fxs.register()
		return fxs
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


const FXA = await Fixture.create('basic.GET.200.json')

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
const addr = `http://${server.address().address}:${server.address().port}`
const commander = new Commander(addr)

function request(path, options = {}) {
	return fetch(addr + path, options)
}

/** @returns {Promise<State>} */
async function fetchState() {
	return (await commander.getState()).json()
}


beforeEach(commander.reset)


describe('Error Handling', () => {
	it('ignores invalid filenames and warns', async t => {
		const spy = spyLogger(t, 'warn')
		const fx0 = await Fixture.create('missing-method-and-status.json')
		const fx1 = await Fixture.create('foo._INVALID_METHOD_.200.json')
		const fx2 = await Fixture.create('bar.GET._INVALID_STATUS_.json')
		equal(spy.calls[0].arguments[0], 'Invalid Filename Convention')
		equal(spy.calls[1].arguments[0], 'Unrecognized HTTP Method: "_INVALID_METHOD_"')
		equal(spy.calls[2].arguments[0], 'Invalid HTTP Response Status: "NaN"')
		await fx0.unregister()
		await fx1.unregister()
		await fx2.unregister()
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
		const b = await FXA.fetchBroker()
		equal(b.file, FXA.file)
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
		const res = await FXA.request({
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

		const fx0 = new Fixture('runtime1.GET.200.txt')
		const fx1 = new Fixture('runtime2.GET.200.txt')
		it('responds debounced when files are added (bulk additions count as 1 increment)', async () => {
			const prom = commander.getSyncVersion(version)
			await fx0.register()
			await fx1.register()
			equal(await (await prom).json(), version + 1)
		})

		it('responds debounced when files are deleted', async () => {
			const prom = commander.getSyncVersion(version + 1)
			await fx0.unregister()
			await fx1.unregister()
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
		const resA = await FXA.request()
		equal(resA.headers.get('set-cookie'), COOKIES.userA)

		const response = await commander.selectCookie('userB')
		deepEqual(await response.json(), [
			['userA', false],
			['userB', true]
		])

		const resB = await FXA.request()
		equal(resB.headers.get('set-cookie'), COOKIES.userB)
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
		await commander.setRouteIsDelayed(FXA.method, FXA.urlMask, true)
		const now = new Date()
		const res = await FXA.request()
		equal(await res.text(), FXA.body)
		equal((new Date()).getTime() - now.getTime() > delay, true)
	})

	describe('Set Route is Delayed', () => {
		it('422 for non-existing route', async () => {
			const res = await commander.setRouteIsDelayed('GET', '/non-existing', true)
			equal(res.status, 422)
			equal(await res.text(), `Route does not exist: GET /non-existing`)
		})
		it('422 for invalid delayed value', async () => {
			const res = await commander.setRouteIsDelayed(FXA.method, FXA.urlMask, 'not-a-boolean')
			equal(await res.text(), 'Expected boolean for "delayed"')
		})
		it('200', async () => {
			const res = await commander.setRouteIsDelayed(FXA.method, FXA.urlMask, true)
			equal((await res.json()).delayed, true)
		})
	})
})

describe('Proxy Fallback', () => {
	describe('Fallback', () => {
		let fallbackServer
		const CUSTOM_COOKIES = ['cookieX=x', 'cookieY=y']
		before(async () => {
			fallbackServer = createServer(async (req, response) => {
				response.writeHead(423, {
					'custom_header': 'my_custom_header',
					'content-type': mimeFor('.txt'),
					'set-cookie': CUSTOM_COOKIES
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

			const res = await request(`/non-existing-mock/${randomUUID()}`, {
				method: 'POST',
				body: reqBodyPayload
			})
			equal(res.status, 423)
			equal(res.headers.get('custom_header'), 'my_custom_header')
			equal(res.headers.get('set-cookie'), CUSTOM_COOKIES.join(', '))
			equal(await res.text(), reqBodyPayload)

			const savedBody = readFileSync(join(mocksDir, 'non-existing-mock/[id].POST.423.txt'), 'utf8')
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

		it('422 for non-existing route', async () => {
			const res = await commander.setRouteIsProxied('GET', '/non-existing', true)
			equal(res.status, 422)
			equal(await res.text(), `Route does not exist: GET /non-existing`)
		})

		it('422 for invalid proxied value', async () => {
			const res = await commander.setRouteIsProxied(FXA.method, FXA.urlMask, 'not-a-boolean')
			equal(res.status, 422)
			equal(await res.text(), 'Expected boolean for "proxied"')
		})

		it('422 for missing proxy fallback', async () => {
			const res = await commander.setRouteIsProxied(FXA.method, FXA.urlMask, true)
			equal(res.status, 422)
			equal(await res.text(), `There’s no proxy fallback`)
		})

		it('200 when setting', async () => {
			await commander.setProxyFallback('https://example.com')
			const res = await commander.setRouteIsProxied(FXA.method, FXA.urlMask, true)
			equal(res.status, 200)
			equal((await res.json()).proxied, true)

			const res2 = await commander.setRouteIsProxied(FXA.method, FXA.urlMask, false)
			equal(res2.status, 200)
			equal((await res2.json()).proxied, false)
		})

		it('200 when unsetting', async () => {
			const res = await commander.setRouteIsProxied(FXA.method, FXA.urlMask, false)
			equal(res.status, 200)
			equal((await res.json()).proxied, false)
		})
	})

	it('updating selected mock resets proxied flag', async () => {
		const fx = await Fixture.create('select-resets-proxied.GET.200.txt')
		await commander.setProxyFallback('http://example.com')
		const r0 = await commander.setRouteIsProxied(fx.method, fx.urlMask, true)
		equal((await r0.json()).proxied, true)

		const r1 = await commander.select(fx.file)
		equal((await r1.json()).proxied, false)

		await commander.setProxyFallback('')
	})
})

describe('Comments', () => {
	let fxIota, fxIotaB, fxKappaA, fxKappaB

	before(async () => {
		fxIota = await Fixture.create('iota.GET.200.txt')
		fxIotaB = await Fixture.create('iota(comment B).GET.200.txt')
		fxKappaA = await Fixture.create('kappa(comment A).GET.200.txt')
		fxKappaB = await Fixture.create('kappa(comment B).GET.200.txt')
	})
	
	after(async () => {
		await fxIota.unregister()
		await fxIotaB.unregister()
		await fxKappaA.unregister()
		await fxKappaB.unregister()
	})

	it('extracts all comments without duplicates', async () => 
		deepEqual((await fetchState()).comments, [
			'(comment A)',
			'(comment B)',
		]))

	it('selects exact', async () => {
		await commander.bulkSelectByComment('(comment B)')
		equal((await (await fxIota.request()).text()), fxIotaB.body)
		equal((await (await fxKappaA.request()).text()), fxKappaB.body)
	})

	it('selects partial', async () => {
		await commander.bulkSelectByComment('(mment A)')
		equal((await (await fxKappaB.request()).text()), fxKappaA.body)
	})
})

describe('404', () => {
	it('when there’s no mock', async () =>
		equal((await request('/non-existing')).status, 404))

	it('when there’s no mock at all for a method', async () =>
		equal((await request('/non-existing-too', { method: 'DELETE' })).status, 404))

	it('ignores files ending in ~ by default, e.g. JetBrains temp files', async () => {
		const fx = await Fixture.create('ignored.GET.200.json~')
		equal((await fx.request()).status, 404)
		await fx.unregister()
	})

	it('ignores static files ending in ~', async () => {
		const fx = await FixtureStatic.create('static/ignored.js~')
		equal((await fx.request()).status, 404)
		await fx.unregister()
	})
})

describe('Default mock', () => {
	let fxA, fxB
	before(async () => {
		fxA = await Fixture.create('alpha.GET.200.txt', 'A')
		fxB = await Fixture.create('alpha(default).GET.200.txt', 'B')
	})
	
	after(async () => {
		await fxA.unregister()
		await fxB.unregister()
	})

	it('sorts mocks list with the user specified default first for dashboard display', async () => {
		const { mocks } = (await fetchState()).brokersByMethod.GET[fxA.urlMask]
		deepEqual(mocks, [
			fxB.file,
			fxA.file
		])
	})
	
	it('Dispatches default mock', async () => {
		const res = await fxA.request()
		deepEqual(await res.text(), fxB.body)
	})
})

describe('JS Function Mocks', () => {
	it('honors filename convention', async () => {
		const fx = await Fixture.create('func.GET.200.js', `
			export default function (req, response) {
  			return 'SOME_STRING_0'
			}`)
		const res = await fx.request()
		equal(res.status, 200)
		equal(res.headers.get('content-type'), mimeFor('.json'))
		equal(res.headers.get('set-cookie'), COOKIES.userA)
		equal(await res.text(), 'SOME_STRING_0')
		await fx.unregister()
	})

	it('can override filename convention (also supports TS)', async () => {
		const fx = await Fixture.create('func.POST.200.ts', `
			export default function (req, response) {
			  response.statusCode = 201
			  response.setHeader('content-type', 'custom-mime')
			  response.setHeader('set-cookie', 'custom-cookie')
			  return 'SOME_STRING_1'
			}`)
		const res = await fx.request({ method: 'POST' })
		equal(res.status, 201)
		equal(res.headers.get('content-type'), 'custom-mime')
		equal(res.headers.get('set-cookie'), 'custom-cookie')
		equal(await res.text(), 'SOME_STRING_1')
		await fx.unregister()
	})
})

describe('Static Files', () => {
	let fxsIndex, fxsAsset
	before(async () => {
		fxsIndex = await FixtureStatic.create('static/index.html', '<h1>Index</h1>')
		fxsAsset = await FixtureStatic.create('static/assets/script.js', 'const a = 1')
	})
	after(async () => {
		await fxsIndex.unregister()
		await fxsAsset.unregister()
	})

	describe('Static File Serving', () => {
		it('Defaults to index.html', async () => {
			const res = await request('/static')
			equal(res.status, 200)
			equal(res.headers.get('content-type'), mimeFor(fxsIndex.file))
			equal(await res.text(), fxsIndex.body)
		})

		it('Serves exacts paths', async () => {
			const res = await fxsAsset.request()
			equal(res.status, 200)
			equal(res.headers.get('content-type'), mimeFor(fxsAsset.file))
			equal(await res.text(), fxsAsset.body)
		})
	})

	it('Static File List', async () => {
		const { staticBrokers } = await fetchState()
		deepEqual(Object.keys(staticBrokers), [
			fxsAsset.urlMask,
			fxsIndex.urlMask
		])
	})

	describe('Set Static Route is Delayed', () => {
		it('422 for non-existing route', async () => {
			const res = await commander.setStaticRouteIsDelayed('/non-existing', true)
			equal(res.status, 422)
			equal(await res.text(), `Static route does not exist: /non-existing`)
		})

		it('422 for invalid delayed value', async () => {
			const res = await commander.setStaticRouteIsDelayed(fxsIndex.urlMask, 'not-a-boolean')
			equal(await res.text(), 'Expected boolean for "delayed"')
		})

		it('200', async () => {
			await commander.setStaticRouteIsDelayed(fxsIndex.urlMask, true)
			const { staticBrokers } = await fetchState()
			equal(staticBrokers[fxsIndex.urlMask].delayed, true)
		})
	})

	describe('Set Static Route Status Code', () => {
		it('422 for non-existing route', async () => {
			const res = await commander.setStaticRouteStatus('/non-existing', 200)
			equal(res.status, 422)
			equal(await res.text(), `Static route does not exist: /non-existing`)
		})

		it('422 for invalid delayed value', async () => {
			const res = await commander.setStaticRouteStatus(fxsIndex.urlMask, 'not-200-or-404')
			equal(res.status, 422)
			equal(await res.text(), 'Expected 200 or 404 status code')
		})

		it('200', async () => {
			const res = await commander.setStaticRouteStatus(fxsIndex.urlMask, 404)
			equal(res.status, 200)
			const { staticBrokers } = await fetchState()
			equal(staticBrokers[fxsIndex.urlMask].status, 404)
		})
	})

	describe('Resets Static Routes', () => {
		beforeEach(async () => {
			await commander.setStaticRouteIsDelayed(fxsIndex.urlMask, true)
			await commander.setStaticRouteStatus(fxsIndex.urlMask, 404)
			await commander.reset()
		})

		it('resets delayed', async () => {
			const { staticBrokers } = await fetchState()
			equal(staticBrokers[fxsIndex.urlMask].delayed, false)
		})

		it('resets status', async () => {
			const { staticBrokers } = await fetchState()
			equal(staticBrokers[fxsIndex.urlMask].status, 200)
		})
	})

	describe('Static Partial Content', () => {
		it('206 serves partial content', async () => {
			const res1 = await fxsIndex.request({ headers: { range: 'bytes=0-3' } })
			const res2 = await fxsIndex.request({ headers: { range: 'bytes=4-' } })
			equal(res1.status, 206)
			equal(res2.status, 206)
			const body = await res1.text() + await res2.text()
			equal(body, fxsIndex.body)
		})

		it('416 on invalid range (end > start)', async () => {
			const res = await fxsIndex.request({ headers: { range: 'bytes=3-0' } })
			equal(res.status, 416)
		})
	})

	it('unregisters static route', async () => {
		await fxsIndex.unregister()
		const { staticBrokers } = await fetchState()
		equal(staticBrokers[fxsIndex.urlMask], undefined)
	})
})



describe('Registering', () => {
	const fxA = new Fixture('register.PUT.200.json')
	const fx500 = new Fixture('register.PUT.500.json')

	it('re-registering is a noop', async () => {
		await fxA.register()
		await fxA.register()
		const b = await fxA.fetchBroker()
		deepEqual(b.mocks, [fxA.file])
	})

	it('registering a 500 unsets auto500', async () => {
		await commander.toggle500(fxA.method, fxA.urlMask)
		await fx500.register()
		const b = await fx500.fetchBroker()
		equal(b.auto500, false)
		deepEqual(b.mocks, [
			fxA.file,
			fx500.file
		])
	})

	it('unregistering selected ensures a mock is selected', async () => {
		await commander.select(fxA.file)
		await fxA.unregister()
		const b = await fxA.fetchBroker()
		deepEqual(b.mocks, [fx500.file]
		)
	})

	it('unregistering the last mock removes broker', async () => {
		await fx500.unregister()
		const b = await fx500.fetchBroker()
		equal(b, undefined)
	})

	// it('unregistering the last PUT mock removes PUT from collection')
})

describe('Dispatch', () => {
	let fixtures

	before(async () => {
		fixtures = [
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

		for (const [, file, body] of fixtures)
			write(file, file.endsWith('.json') ? JSON.stringify(body) : body)

		write('api/.GET.500.txt', 'keeps non-autogenerated 500')
		write('api/alternative(comment-2).GET.200.json', JSON.stringify({ comment: 2 }))
		write('api/my-route(comment-2).GET.200.json', JSON.stringify({ comment: 2 }))

		// JavaScript to JSON (params for testing URL decoding)
		write('/api/object?param=[param].GET.200.js', 'export default { JSON_FROM_JS: true }')
		await sleep()
	})

	it('422 when updating non-existing mock alternative. There are mocks for /alpha but not for this one', async () => {
		const missingFile = 'alpha(non-existing-variant).GET.200.json'
		const res = await commander.select(missingFile)
		equal(res.status, 422)
		equal(await res.text(), `Missing Mock: ${missingFile}`)
	})


	it('tests many', () => {
		async function testMockDispatching(url, file, expectedBody, forcedMime = undefined) {
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
		}

		for (const [url, file, body] of fixtures)
			testMockDispatching(url, file, body)

		testMockDispatching('/api/object', 'api/object.GET.200.js', { JSON_FROM_JS: true }, mimeFor('.json'))
	})

	it('assigns custom mimes derived from extension', async () => {
		const fx = await Fixture.create(`custom-extension.GET.200.${CUSTOM_EXT}`)
		const res = await fx.request()
		equal(res.headers.get('content-type'), CUSTOM_MIME)
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
		equal((await FXA.request()).status, FXA.status)

		const r0 = await commander.toggle500(FXA.method, FXA.urlMask)
		equal((await r0.json()).auto500, true)
		equal((await FXA.request()).status, 500)

		const r1 = await commander.toggle500(FXA.method, FXA.urlMask)
		equal((await r1.json()).auto500, false)
		equal((await FXA.request()).status, FXA.status)
	})
})


await it('head for get. returns the headers without body only for GETs requested as HEAD', async () => {
	const res = await FXA.request({ method: 'HEAD' })
	equal(res.status, 200)
	equal(res.headers.get('content-length'), String(Buffer.byteLength(FXA.body)))
	equal(await res.text(), '')
})

server?.close()

