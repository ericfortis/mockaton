import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { equal, deepEqual, match } from 'node:assert/strict'
import { describe, it, before, beforeEach, after } from 'node:test'
import { unlinkSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

import { API } from './ApiConstants.js'
import { logger } from './utils/logger.js'
import { mimeFor } from './utils/mime.js'
import { Mockaton } from './Mockaton.js'
import { readBody } from './utils/http-request.js'
import { Commander } from './ApiCommander.js'
import { CorsHeader } from './utils/http-cors.js'
import { parseFilename } from './Filename.js'


const mocksDir = mkdtempSync(tmpdir() + '/mocks') + '/'
const staticDir = mkdtempSync(tmpdir() + '/static') + '/'

async function sleep(ms = 50) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

function spyLogger(t, method) {
	const spy = t.mock.method(logger, method)
	spy.mock.mockImplementation(() => null)
	return spy.mock
}


class BaseFixture {
	dir = ''
	urlMask = ''
	method = ''

	constructor(file, body = '') {
		this.file = file
		this.body = body || `Body for ${file}`
	}

	get path() {
		return join(this.dir, this.file)
	}

	request(options = {}) {
		options.method ??= this.method
		return request(this.urlMask, options)
	}

	async register() {
		writeFileSync(this.path, this.body, 'utf8')
		await sleep()
	}

	async unregister() {
		unlinkSync(this.path)
		await sleep()
	}
}

class Fixture extends BaseFixture {
	constructor(file, body = '') {
		super(file, body)
		this.dir = mocksDir
		const t = parseFilename(file)
		this.urlMask = t.urlMask
		this.method = t.method
		this.status = t.status
		this.ext = t.ext
	}

	static async create(file, body) {
		const fx = new this(file, body)
		await fx.register()
		return fx
	}

	async fetchBroker() {
		return (await fetchState()).brokersByMethod?.[this.method]?.[this.urlMask]
	}
}


class FixtureStatic extends BaseFixture {
	constructor(file, body = '') {
		super(file, body)
		this.dir = staticDir
		this.urlMask = '/' + file
		this.method = 'GET'
	}

	static async create(file, body) {
		const fx = new this(file, body)
		await fx.register()
		return fx
	}
}


const FX = await Fixture.create('basic.GET.200.json')

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
const api = new Commander(addr)

/** @returns {Promise<State>} */
async function fetchState() {
	return (await api.getState()).json()
}

function request(path, options = {}) {
	return fetch(addr + path, options)
}


beforeEach(api.reset)


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
		const b = await FX.fetchBroker()
		equal(b.file, FX.file)
	})
})


describe('CORS', () => {
	describe('Set CORS allowed', () => {
		it('422 for non boolean', async () => {
			const res = await api.setCorsAllowed('not-a-boolean')
			equal(res.status, 422)
			equal(await res.text(), 'Expected boolean for "corsAllowed"')
		})

		it('200', async () => {
			const res = await api.setCorsAllowed(true)
			equal(res.status, 200)
			equal((await fetchState()).corsAllowed, true)

			await api.setCorsAllowed(false)
			equal((await fetchState()).corsAllowed, false)
		})
	})

	it('preflights', async () => {
		await api.setCorsAllowed(true)
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
		const res = await FX.request({
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
			const res = await api.getSyncVersion(-1)
			version = await res.json()
		})

		let fx0
		it('responds when a file is added', async () => {
			const prom = api.getSyncVersion(version)
			fx0 = await Fixture.create('runtime1.GET.200.txt')
			equal(await (await prom).json(), version + 1)
		})

		it('responds when a file is deleted', async () => {
			const prom = api.getSyncVersion(version + 1)
			await fx0.unregister()
			equal(await (await prom).json(), version + 2)
		})
		// TODO think about testing the debounce for bulk additions or removals
	})
})


describe('Cookie', () => {
	it('422 when trying to select non-existing cookie', async () =>
		equal((await api.selectCookie('non-existing-cookie-key')).status, 422))

	it('defaults to the first key:value', async () =>
		deepEqual((await fetchState()).cookies, [
			['userA', true],
			['userB', false]
		]))

	it('updates selected cookie', async () => {
		const resA = await FX.request()
		equal(resA.headers.get('set-cookie'), COOKIES.userA)

		const response = await api.selectCookie('userB')
		deepEqual(await response.json(), [
			['userA', false],
			['userB', true]
		])

		const resB = await FX.request()
		equal(resB.headers.get('set-cookie'), COOKIES.userB)
	})
})


describe('Delay', () => {
	describe('Set Global Delay', () => {
		it('422 for invalid global delay value', async () => {
			const res = await api.setGlobalDelay('not-a-number')
			equal(res.status, 422)
			equal(await res.text(), 'Expected non-negative integer for "delay"')
		})
		it('200 for valid global delay value', async () => {
			const res = await api.setGlobalDelay(150)
			equal(res.status, 200)
			equal((await fetchState()).delay, 150)
		})
	})

	it('updates route delay', async () => {
		const delay = 120
		await api.setGlobalDelay(delay)
		await api.setRouteIsDelayed(FX.method, FX.urlMask, true)
		const now = new Date()
		const res = await FX.request()
		equal(await res.text(), FX.body)
		equal((new Date()).getTime() - now.getTime() > delay, true)
	})

	describe('Set Route is Delayed', () => {
		it('422 for non-existing route', async () => {
			const res = await api.setRouteIsDelayed('GET', '/non-existing', true)
			equal(res.status, 422)
			equal(await res.text(), `Route does not exist: GET /non-existing`)
		})
		it('422 for invalid delayed value', async () => {
			const res = await api.setRouteIsDelayed(FX.method, FX.urlMask, 'not-a-boolean')
			equal(await res.text(), 'Expected boolean for "delayed"')
		})
		it('200', async () => {
			const res = await api.setRouteIsDelayed(FX.method, FX.urlMask, true)
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
			await api.setProxyFallback(`http://localhost:${fallbackServer.address().port}`)
			await api.setCollectProxied(true)
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
			const res = await api.setProxyFallback('bad url')
			equal(res.status, 422)
			equal(await res.text(), 'Invalid Proxy Fallback URL')
		})

		it('sets fallback', async () => {
			const res = await api.setProxyFallback('http://example.com')
			equal(res.status, 200)
			equal((await fetchState()).proxyFallback, 'http://example.com')
		})

		it('unsets fallback', async () => {
			const res = await api.setProxyFallback('')
			equal(res.status, 200)
			equal((await fetchState()).proxyFallback, '')
		})
	})

	describe('Set Collect Proxied', () => {
		it('422 for invalid collectProxied value', async () => {
			const res = await api.setCollectProxied('not-a-boolean')
			equal(res.status, 422)
			equal(await res.text(), 'Expected a boolean for "collectProxied"')
		})

		it('200 set and unset', async () => {
			await api.setCollectProxied(true)
			equal((await fetchState()).collectProxied, true)

			await api.setCollectProxied(false)
			equal((await fetchState()).collectProxied, false)
		})
	})

	describe('Set Route is Proxied', () => {
		beforeEach(async () => await api.setProxyFallback(''))

		it('422 for non-existing route', async () => {
			const res = await api.setRouteIsProxied('GET', '/non-existing', true)
			equal(res.status, 422)
			equal(await res.text(), `Route does not exist: GET /non-existing`)
		})

		it('422 for invalid proxied value', async () => {
			const res = await api.setRouteIsProxied(FX.method, FX.urlMask, 'not-a-boolean')
			equal(res.status, 422)
			equal(await res.text(), 'Expected boolean for "proxied"')
		})

		it('422 for missing proxy fallback', async () => {
			const res = await api.setRouteIsProxied(FX.method, FX.urlMask, true)
			equal(res.status, 422)
			equal(await res.text(), `There’s no proxy fallback`)
		})

		it('200 when setting', async () => {
			await api.setProxyFallback('https://example.com')
			const res = await api.setRouteIsProxied(FX.method, FX.urlMask, true)
			equal(res.status, 200)
			equal((await res.json()).proxied, true)

			const res2 = await api.setRouteIsProxied(FX.method, FX.urlMask, false)
			equal(res2.status, 200)
			equal((await res2.json()).proxied, false)
		})

		it('200 when unsetting', async () => {
			const res = await api.setRouteIsProxied(FX.method, FX.urlMask, false)
			equal(res.status, 200)
			equal((await res.json()).proxied, false)
		})
	})

	it('updating selected mock resets proxied flag', async () => {
		const fx = await Fixture.create('select-resets-proxied.GET.200.txt')
		await api.setProxyFallback('http://example.com')
		const r0 = await api.setRouteIsProxied(fx.method, fx.urlMask, true)
		equal((await r0.json()).proxied, true)

		const r1 = await api.select(fx.file)
		equal((await r1.json()).proxied, false)

		await api.setProxyFallback('')
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
		const fx = await FixtureStatic.create('static-ignored.js~')
		equal((await fx.request()).status, 404)
		await fx.unregister()
	})
})


describe('Default Mock', () => {
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


describe('Dynamic Mocks', () => {
	it('JS object is sent as JSON', async () => {
		const fx = await Fixture.create(
			'js-object.GET.200.js',
			'export default { FROM_JS: true }')
		const res = await fx.request()
		equal(res.headers.get('content-type'), mimeFor('.json'))
		deepEqual(await res.json(), { FROM_JS: true })
		await fx.unregister()
	})

	it('TS array is sent as JSON', async () => {
		const fx = await Fixture.create(
			'js-object.GET.200.ts',
			'export default ["from ts"]')
		const res = await fx.request()
		equal(res.headers.get('content-type'), mimeFor('.json'))
		deepEqual(await res.json(), ['from ts'])
		await fx.unregister()
	})
})


describe('Dynamic Function Mocks', () => {
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
		fxsIndex = await FixtureStatic.create('index.html', '<h1>Index</h1>')
		fxsAsset = await FixtureStatic.create('asset-script.js', 'const a = 1')
	}) // the last test unregisters them

	describe('Static File Serving', () => {
		it('Defaults to index.html', async () => {
			const res = await request('/')
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
			const res = await api.setStaticRouteIsDelayed('/non-existing', true)
			equal(res.status, 422)
			equal(await res.text(), `Static route does not exist: /non-existing`)
		})

		it('422 for invalid delayed value', async () => {
			const res = await api.setStaticRouteIsDelayed(fxsIndex.urlMask, 'not-a-boolean')
			equal(await res.text(), 'Expected boolean for "delayed"')
		})

		it('200', async () => {
			await api.setStaticRouteIsDelayed(fxsIndex.urlMask, true)
			const { staticBrokers } = await fetchState()
			equal(staticBrokers[fxsIndex.urlMask].delayed, true)
		})
	})

	describe('Set Static Route Status Code', () => {
		it('422 for non-existing route', async () => {
			const res = await api.setStaticRouteStatus('/non-existing', 200)
			equal(res.status, 422)
			equal(await res.text(), `Static route does not exist: /non-existing`)
		})

		it('422 for invalid delayed value', async () => {
			const res = await api.setStaticRouteStatus(fxsIndex.urlMask, 'not-200-or-404')
			equal(res.status, 422)
			equal(await res.text(), 'Expected 200 or 404 status code')
		})

		it('200', async () => {
			const res = await api.setStaticRouteStatus(fxsIndex.urlMask, 404)
			equal(res.status, 200)
			const { staticBrokers } = await fetchState()
			equal(staticBrokers[fxsIndex.urlMask].status, 404)
		})
	})

	describe('Resets Static Routes', () => {
		beforeEach(async () => {
			await api.setStaticRouteIsDelayed(fxsIndex.urlMask, true)
			await api.setStaticRouteStatus(fxsIndex.urlMask, 404)
			await api.reset()
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
		await fxsAsset.unregister()
		const { staticBrokers } = await fetchState()
		equal(staticBrokers[fxsIndex.urlMask], undefined)
		equal(staticBrokers[fxsAsset.urlMask], undefined)
	})
})


describe('Toggle 500', () => {
	it('toggles 500', async () => {
		equal((await FX.request()).status, FX.status)

		const r0 = await api.toggle500(FX.method, FX.urlMask)
		equal((await r0.json()).auto500, true)
		equal((await FX.request()).status, 500)

		const r1 = await api.toggle500(FX.method, FX.urlMask)
		equal((await r1.json()).auto500, false)
		equal((await FX.request()).status, FX.status)
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
		await api.toggle500(fxA.method, fxA.urlMask)
		await fx500.register()
		const b = await fx500.fetchBroker()
		equal(b.auto500, false)
		deepEqual(b.mocks, [
			fxA.file,
			fx500.file
		])
	})

	it('unregistering selected ensures a mock is selected', async () => {
		await api.select(fxA.file)
		await fxA.unregister()
		const b = await fxA.fetchBroker()
		deepEqual(b.mocks, [fx500.file])
	})

	it('unregistering the last mock removes broker', async () => {
		await fx500.unregister()
		const b = await fx500.fetchBroker()
		equal(b, undefined)
	})
})


describe('Index-like routes', () => {
	it('resolves dirs to the file without urlMask', async () => {
		const fx = await Fixture.create('.GET.200.json')
		const res = await request('/')
		equal(await res.text(), fx.body)
		await fx.unregister()
	})
})


describe('MIME', () => {
	it('derives content-type from known mime', async () => {
		const fx = await Fixture.create('tmp.GET.200.json')
		const res = await fx.request()
		equal(res.headers.get('content-type'), 'application/json')
		await fx.unregister()
	})

	it('derives content-type from custom mime', async () => {
		const fx = await Fixture.create(`tmp.GET.200.${CUSTOM_EXT}`)
		const res = await fx.request()
		equal(res.headers.get('content-type'), CUSTOM_MIME)
		await fx.unregister()
	})
})


describe('Method and Status', () => {
	const fx = new Fixture('uncommon-method.ACL.201.txt')
	before(async () => await fx.register())
	after(async () => await fx.unregister())

	it('dispatches the response status', async () => {
		const res = await fx.request()
		equal(res.status, fx.status)
	})

	it('dispatches uncommon but supported methods', async () => {
		const res = await fx.request()
		equal(res.status, fx.status)
	})

	it('404s when method mismatches', async () => {
		const res = await fx.request({ method: 'POST' })
		equal(res.status, 404)
	})
})


describe('Select', () => {
	const fx = new Fixture('select(default).GET.200.txt')
	const fxAlt = new Fixture('select(variant).GET.200.txt')
	const fxUnregistered = new Fixture('select(non-existing).GET.200.txt')
	before(async () => {
		await fx.register()
		await fxAlt.register()
	})
	after(async () => {
		await fx.unregister()
		await fxAlt.unregister()
	})

	it('422 when updating non-existing mock alternative', async () => {
		const res = await api.select(fxUnregistered.file)
		equal(res.status, 422)
		equal(await res.text(), `Missing Mock: ${fxUnregistered.file}`)
	})

	it('selects variant', async () => {
		const res0 = await request('/select')
		equal(await res0.text(), fx.body)

		await api.select(fxAlt.file)
		const res1 = await request('/select')
		equal(await res1.text(), fxAlt.body)
	})
})


describe('Bulk Select', () => {
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
		await api.bulkSelectByComment('(comment B)')
		equal((await (await fxIota.request()).text()), fxIotaB.body)
		equal((await (await fxKappaA.request()).text()), fxKappaB.body)
	})

	it('selects partial', async () => {
		await api.bulkSelectByComment('(mment A)')
		equal((await (await fxKappaB.request()).text()), fxKappaA.body)
	})
})


describe('Dispatch', () => {
	let fixtures

	before(async () => {
		fixtures = [
			[
				'/dot.in.path',
				'dot.in.path.GET.200.json',
				'Dot_in_Path'
			], [
				'/space & colon:',
				'space & colon:.GET.200.json',
				'Decodes URI'
			],


			// Dynamic Params
			[
				'/user/1234',
				'user/[id]/.GET.200.json',
				'variable at end'
			], [
				'/user/1234/suffix',
				'user/[id]/suffix.GET.200.json',
				'sandwich a variable that another route has at the end'
			], [
				'/user/exact-route',
				'user/exact-route.GET.200.json',
				'ensure dynamic params do not take precedence over exact routes'
			],

			// Query String
			// TODO ignore on Windows (because of ?)
			[
				'/my-query-string?foo=[foo]&bar=[bar]',
				'my-query-string?foo=[foo]&bar=[bar].GET.200.json',
				'two query string params'
			], [
				'/company-a',
				'/company-a/[id]?limit=[limit].GET.200.json',
				'without pretty-param nor query-params'
			], [
				'/company-b/',
				'company-b/[id]?limit=[limit].GET.200.json',
				'without pretty-param nor query-params with trailing slash'
			], [
				'/company-c/1234',
				'company-c/[id]?limit=[limit].GET.200.json',
				'with pretty-param and without query-params'
			], [
				'/company-d/1234/?',
				'company-d/[id]?limit=[limit].GET.200.json',
				'with pretty-param and without query-params, but with trailing slash and "?"'
			], [
				'/company-e/1234/?limit=4',
				'company-e/[id]?limit=[limit].GET.200.json',
				'with pretty-param and query-params'
			],
		]

		for (const [, file, body] of fixtures) {
			mkdirSync(join(dirname(mocksDir + file)), { recursive: true })
			await Fixture.create(file, JSON.stringify(body))
		}
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

	})
})


await it('head for get. returns the headers without body only for GETs requested as HEAD', async () => {
	const res = await FX.request({ method: 'HEAD' })
	equal(res.status, 200)
	equal(res.headers.get('content-length'), String(Buffer.byteLength(FX.body)))
	equal(await res.text(), '')
})

server?.close()

