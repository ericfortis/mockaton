import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { writeFile, unlink } from 'node:fs/promises'
import { equal, deepEqual, match } from 'node:assert/strict'
import { describe, it, before, beforeEach, after } from 'node:test'
import { mkdtempSync, mkdirSync, readFileSync } from 'node:fs'

import { API } from './ApiConstants.js'
import { logger } from './utils/logger.js'
import { mimeFor } from './utils/mime.js'
import { Mockaton } from './Mockaton.js'
import { readBody } from './utils/http-request.js'
import { Commander } from './ApiCommander.js'
import { CorsHeader } from './utils/http-cors.js'
import { parseFilename } from './Filename.js'
import { uiSyncVersion } from './Watcher.js'


const mocksDir = mkdtempSync(tmpdir() + '/mocks') + '/'
const staticDir = mkdtempSync(tmpdir() + '/static') + '/'


class BaseFixture {
	dir = ''
	urlMask = ''
	method = ''

	constructor(file, body = '') {
		this.file = file
		this.body = body || `Body for ${file}`
	}

	async register() {
		const nextVer = api.getSyncVersion(uiSyncVersion.version)
		await this.write()
		await nextVer
	}

	async unregister() {
		const nextVer = api.getSyncVersion(uiSyncVersion.version)
		await this.unlink()
		await nextVer
	}

	async write() { await writeFile(this.path, this.body, 'utf8') }
	async unlink() { await unlink(this.path) }

	get path() { return join(this.dir, this.file) }

	request(options = {}) {
		options.method ??= this.method
		return request(this.urlMask, options)
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
}


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

const FX = new Fixture('basic.GET.200.json')
await FX.register()

beforeEach(api.reset)
after(() => server?.close())

describe('Error Handling', () => {
	function spyLogger(t, method) {
		const spy = t.mock.method(logger, method)
		spy.mock.mockImplementation(() => null)
		return spy.mock
	}

	it('rejects invalid mock filenames', async t => {
		const spy = spyLogger(t, 'warn')
		const fx = new Fixture('missing-method-and-status.json')
		await fx.write()
		await sleep()
		equal(spy.calls[0].arguments[0], 'Invalid Filename Convention')
		await fx.unlink()
	})

	it('rejects invalid mock filenames (bad method)', async t => {
		const spy = spyLogger(t, 'warn')
		const fx = new Fixture('foo._INVALID_METHOD_.200.json')
		await fx.write()
		await sleep()
		equal(spy.calls[0].arguments[0], 'Unrecognized HTTP Method: "_INVALID_METHOD_"')
		await fx.unlink()
	})

	it('rejects invalid mock filenames (bad status)', async t => {
		const spy = spyLogger(t, 'warn')
		const fx = new Fixture('bar.GET._INVALID_STATUS_.json')
		await fx.write()
		await sleep()
		equal(spy.calls[0].arguments[0], 'Invalid HTTP Response Status: "NaN"')
		await fx.unlink()
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
		const res = await request(API.cookies, {
			method: 'PATCH',
			body: '[invalid_json]'
		})
		equal(res.status, 422)
		equal(spy.calls[0].arguments[1], 'BodyReaderError: Could not parse')
	})

	it('returns 500 when a handler throws', async t => {
		const spy = spyLogger(t, 'error')
		const res = await request(API.throws)
		equal(res.status, 500)
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

		const fx0 = new Fixture('runtime1.GET.200.txt')
		it('responds when a file is added', async () => {
			const prom = api.getSyncVersion(version)
			await fx0.register()
			equal(await (await prom).json(), version + 1)
		})

		it('responds when a file is deleted', async () => {
			const prom = api.getSyncVersion(version + 1)
			await fx0.unregister()
			equal(await (await prom).json(), version + 2)
		})
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
		const fx = new Fixture('select-resets-proxied.GET.200.txt')
		await fx.register()
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

	it('404s ignored files', async t => {
		const fx = new Fixture('ignored.GET.200.json~')
		await fx.write()
		await sleep()
		equal((await fx.request()).status, 404)
		await fx.unlink()
	})

	it('404s ignored static files', async () => {
		const fx = new FixtureStatic('static-ignored.js~')
		await fx.write()
		await sleep()
		equal((await fx.request()).status, 404)
		await fx.unlink()
	})
})


describe('Default Mock', () => {
	const fxA = new Fixture('alpha.GET.200.txt', 'A')
	const fxB = new Fixture('alpha(default).GET.200.txt', 'B')
	before(async () => {
		await fxA.register()
		await fxB.register()
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
		equal(await res.text(), fxB.body)
	})
})


describe('Dynamic Mocks', () => {
	it('JS object is sent as JSON', async () => {
		const fx = new Fixture(
			'js-object.GET.200.js',
			'export default { FROM_JS: true }')
		await fx.register()
		const res = await fx.request()
		equal(res.headers.get('content-type'), mimeFor('.json'))
		deepEqual(await res.json(), { FROM_JS: true })
		await fx.unregister()
	})

	it('TS array is sent as JSON', async () => {
		const fx = new Fixture(
			'js-object.GET.200.ts',
			'export default ["from ts"]')
		await fx.register()
		const res = await fx.request()
		equal(res.headers.get('content-type'), mimeFor('.json'))
		deepEqual(await res.json(), ['from ts'])
		await fx.unregister()
	})
})


describe('Dynamic Function Mocks', () => {
	it('honors filename convention', async () => {
		const fx = new Fixture('func.GET.200.js', `
			export default function (req, response) {
  			return 'SOME_STRING_0'
			}`)
		await fx.register()
		const res = await fx.request()
		equal(res.status, 200)
		equal(res.headers.get('content-type'), mimeFor('.json'))
		equal(res.headers.get('set-cookie'), COOKIES.userA)
		equal(await res.text(), 'SOME_STRING_0')
		await fx.unregister()
	})

	it('can override filename convention (also supports TS)', async () => {
		const fx = new Fixture('func.POST.200.ts', `
			export default function (req, response) {
			  response.statusCode = 201
			  response.setHeader('content-type', 'custom-mime')
			  response.setHeader('set-cookie', 'custom-cookie')
			  return 'SOME_STRING_1'
			}`)
		await fx.register()
		const res = await fx.request({ method: 'POST' })
		equal(res.status, 201)
		equal(res.headers.get('content-type'), 'custom-mime')
		equal(res.headers.get('set-cookie'), 'custom-cookie')
		equal(await res.text(), 'SOME_STRING_1')
		await fx.unregister()
	})
})


describe('Static Files', () => {
	const fxsIndex = new FixtureStatic('index.html', '<h1>Index</h1>')
	const fxsAsset = new FixtureStatic('asset-script.js', 'const a = 1')
	before(async () => {
		await fxsIndex.register()
		await fxsAsset.register()
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

	it('register', async () => {
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
		const fx = new Fixture('.GET.200.json')
		await fx.register()
		const res = await request('/')
		equal(await res.text(), fx.body)
		await fx.unregister()
	})
})


describe('MIME', () => {
	it('derives content-type from known mime', async () => {
		const fx = new Fixture('tmp.GET.200.json')
		await fx.register()
		const res = await fx.request()
		equal(res.headers.get('content-type'), 'application/json')
		await fx.unregister()
	})

	it('derives content-type from custom mime', async () => {
		const fx = new Fixture(`tmp.GET.200.${CUSTOM_EXT}`)
		await fx.register()
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
	const fxIota = new Fixture('iota.GET.200.txt')
	const fxIotaB = new Fixture('iota(comment B).GET.200.txt')
	const fxKappaA = new Fixture('kappa(comment A).GET.200.txt')
	const fxKappaB = new Fixture('kappa(comment B).GET.200.txt')
	before(async () => {
		await fxIota.register()
		await fxIotaB.register()
		await fxKappaA.register()
		await fxKappaB.register()
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


describe('Decoding URLs', () => {
	it('allows dots, spaces, amp, etc.', async () => {
		const fx = new Fixture('dot.in.path and amp & and colon:.GET.200.txt')
		await fx.register()
		const res = await fx.request()
		equal(await res.text(), fx.body)
		await fx.unregister()
	})
})


describe('Dynamic Params', () => {
	const fx0 = new Fixture('dynamic-params/[id]/.GET.200.txt')
	const fx1 = new Fixture('dynamic-params/[id]/suffix.GET.200.txt')
	const fx2 = new Fixture('dynamic-params/[id]/suffix/[id].GET.200.txt')
	const fx3 = new Fixture('dynamic-params/exact-route.GET.200.txt')
	before(async () => {
		mkdirSync(mocksDir + 'dynamic-params/[id]/suffix/[id]', { recursive: true })
		await fx0.register()
		await fx1.register()
		await fx2.register()
		await fx3.register()
	})
	after(async () => {
		await fx0.unregister()
		await fx1.unregister()
		await fx2.unregister()
		await fx3.unregister()
	})

	it('variable at end', async () => {
		const res = await fx0.request()
		equal(await res.text(), fx0.body)
	})

	it('sandwich variable present in another route at its end', async () => {
		const res = await fx1.request()
		equal(await res.text(), fx1.body)
	})

	it('sandwich fixed part in dynamic variables', async () => {
		const res = await fx2.request()
		equal(await res.text(), fx2.body)
	})

	it('ensure dynamic params do not take precedence over exact routes', async () => {
		const res = await fx3.request()
		equal(await res.text(), fx3.body)
	})
})


describe('Query String', () => {
	const fx0 = new Fixture('query-string?foo=[foo]&bar=[bar].GET.200.json')
	const fx1 = new Fixture('query-string/[id]?limit=[limit].GET.200.json')
	before(async () => {
		mkdirSync(mocksDir + 'query-string', { recursive: true })
		await fx0.register()
		await fx1.register()
	})
	after(async () => {
		await fx0.unregister()
		await fx1.unregister()
	})

	it('multiple params', async () => {
		const res = await fx0.request()
		equal(await res.text(), fx0.body)
	})
	it('with pretty-param and without query-params', async () => {
		const res = await request('/query-string/1234')
		equal(await res.text(), fx1.body)
	})
	it('with pretty-param and without query-params, but with trailing slash and "?"', async () => {
		const res = await request('/query-string/1234/?')
		equal(await res.text(), fx1.body)
	})
	it('with pretty-param and query-params', async () => {
		const res = await request('/query-string/1234/?limit=4')
		equal(await res.text(), fx1.body)
	})
})


it('head for get. returns the headers without body only for GETs requested as HEAD', async () => {
	const res = await FX.request({ method: 'HEAD' })
	equal(res.status, 200)
	equal(res.headers.get('content-length'), String(Buffer.byteLength(FX.body)))
	equal(await res.text(), '')
})


// # Utils

async function sleep(ms = 50) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

// TODO @ThinkAbout when running register() multiple times in a setup, each one will reinit the collection
// TODO @ThinkAbout testing debounced bulk additions or removals

