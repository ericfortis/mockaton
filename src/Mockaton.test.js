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
import { watchMocksDir, watchStaticDir } from './Watcher.js'


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
		const nextVerPromise = api.getSyncVersion()
		await this.write()
		await nextVerPromise
	}

	async unregister() {
		const nextVerPromise = api.getSyncVersion()
		await this.unlink()
		await nextVerPromise
	}

	async write() { await writeFile(this.path, this.body, 'utf8') }
	async unlink() { await unlink(this.path) }

	async sync() {
		await this.write()
		await sync()
	}

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
const CUSTOM_HEADER_NAME = 'custom_header_name'
const CUSTOM_HEADER_VAL = 'custom_header_val'
const ALLOWED_ORIGIN = 'http://example.com'

const server = await Mockaton({
	mocksDir,
	staticDir,
	onReady() {},
	cookies: COOKIES,
	extraHeaders: [CUSTOM_HEADER_NAME, CUSTOM_HEADER_VAL],
	extraMimes: { [CUSTOM_EXT]: CUSTOM_MIME },
	logLevel: 'quiet',
	corsOrigins: [ALLOWED_ORIGIN],
	corsExposedHeaders: ['Content-Encoding'],
	watcherEnabled: false,
})
after(() => server?.close())

const addr = `http://${server.address().address}:${server.address().port}`
const api = new Commander(addr)


/** @returns {Promise<State>} */
async function fetchState() {
	return (await api.getState()).json()
}

async function sync() {
	await api.reset()
}

function request(path, options = {}) {
	return fetch(addr + path, options)
}


describe('Windows', () => {
	it('path separators are normalized to forward slashes', async () => {
		const fx = new Fixture('win-paths.GET.200.json')
		await fx.sync()
		const b = await fx.fetchBroker()
		equal(b.file, fx.file)
		await fx.unlink()
	})
})


describe('Rejects malicious URLs', () => {
	[
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
				equal((await request(url)).status, status)))
})


describe('Warnings', () => {
	function spyLogger(t, method) {
		const spy = t.mock.method(logger, method)
		spy.mock.mockImplementation(() => null)
		return spy.mock
	}

	it('Rejects invalid filenames', async t => {
		const spy = spyLogger(t, 'warn')
		const fx0 = new Fixture('bar.GET._INVALID_STATUS_.json')
		const fx1 = new Fixture('foo._INVALID_METHOD_.202.json')
		const fx2 = new Fixture('missing-method-and-status.json')
		await Promise.all([fx0.write(), fx1.write(), fx2.write()])
		await sync()

		equal(spy.calls[0].arguments[0], 'Invalid HTTP Response Status: "NaN"')
		equal(spy.calls[1].arguments[0], 'Unrecognized HTTP Method: "_INVALID_METHOD_"')
		equal(spy.calls[2].arguments[0], 'Invalid Filename Convention')

		await Promise.all([fx0.unlink(), fx1.unlink(), fx2.unlink()])
	})

	it('body parser rejects invalid JSON in API requests', async t => {
		const spy = spyLogger(t, 'access')
		const r = await request(API.cookies, {
			method: 'PATCH',
			body: '[invalid_json]'
		})
		statusIsUnprocessable(r)
		equal(spy.calls[0].arguments[1], 'BodyReaderError: Could not parse')
	})

	it('returns 500 when a handler throws', async t => {
		const spy = spyLogger(t, 'error')
		const r = await request(API.throws)
		equal(r.status, 500)
		equal(spy.calls[0].arguments[2], 'Test500')
	})
})


describe('CORS', () => {
	describe('Set CORS allowed', () => {
		it('422 for non boolean', async () => {
			const r = await api.setCorsAllowed('not-a-boolean')
			statusIsUnprocessable(r)
			equal(await r.text(), 'Expected boolean for "corsAllowed"')
		})

		it('200', async () => {
			const r = await api.setCorsAllowed(true)
			statusIsOk(r)
			isTrue((await fetchState()).corsAllowed)

			await api.setCorsAllowed(false)
			isFalse((await fetchState()).corsAllowed)
		})
	})

	it('preflights', async () => {
		await api.setCorsAllowed(true)
		const r = await request('/does-not-matter', {
			method: 'OPTIONS',
			headers: {
				[CorsHeader.Origin]: ALLOWED_ORIGIN,
				[CorsHeader.AcRequestMethod]: 'GET'
			}
		})
		equal(r.status, 204)
		equal(r.headers.get(CorsHeader.AcAllowOrigin), ALLOWED_ORIGIN)
		equal(r.headers.get(CorsHeader.AcAllowMethods), 'GET')
	})

	it('responds', async () => {
		const fx = new Fixture('cors-response.GET.200.json')
		await fx.sync()
		const r = await fx.request({
			headers: {
				[CorsHeader.Origin]: ALLOWED_ORIGIN
			}
		})
		statusIsOk(r)
		equal(r.headers.get(CorsHeader.AcAllowOrigin), ALLOWED_ORIGIN)
		equal(r.headers.get(CorsHeader.AcExposeHeaders), 'Content-Encoding')
		await fx.unlink()
	})
})


describe('Dashboard', () => {
	it('renders', async () => {
		const r = await request(API.dashboard)
		match(await r.text(), new RegExp('<!DOCTYPE html>'))
	})

	it('query string is accepted', async () => {
		const r = await request(API.dashboard + '?foo=bar')
		match(await r.text(), new RegExp('<!DOCTYPE html>'))
	})
})


describe('Cookie', () => {
	it('422 when trying to select non-existing cookie', async () => {
		const r = await api.selectCookie('non-existing-cookie-key')
		statusIsUnprocessable(r)
	})

	it('defaults to the first key:value', async () =>
		deepEqual((await fetchState()).cookies, [
			['userA', true],
			['userB', false]
		]))

	it('updates selected cookie', async () => {
		const fx = new Fixture('update-cookie.GET.200.json')
		await fx.sync()
		const resA = await fx.request()
		equal(resA.headers.get('set-cookie'), COOKIES.userA)

		const response = await api.selectCookie('userB')
		deepEqual(await response.json(), [
			['userA', false],
			['userB', true]
		])

		const resB = await fx.request()
		equal(resB.headers.get('set-cookie'), COOKIES.userB)
		await fx.unlink()
	})
})


describe('Delay', () => {
	describe('Set Global Delay', () => {
		it('422 for invalid global delay value', async () => {
			const r = await api.setGlobalDelay('not-a-number')
			statusIsUnprocessable(r)
			equal(await r.text(), 'Expected non-negative integer for "delay"')
		})
		it('200 for valid global delay value', async () => {
			const r = await api.setGlobalDelay(150)
			statusIsOk(r)
			equal((await fetchState()).delay, 150)
		})
	})

	it('updates route delay', async () => {
		const fx = new Fixture('route-delay.GET.200.json')
		await fx.sync()
		const delay = 120
		await api.setGlobalDelay(delay)
		await api.setRouteIsDelayed(fx.method, fx.urlMask, true)
		const now = new Date()
		const r = await fx.request()
		equal(await r.text(), fx.body)
		isTrue((new Date()).getTime() - now.getTime() > delay)
		await fx.unlink()
	})

	describe('Set Route is Delayed', () => {
		it('422 for non-existing route', async () => {
			const r = await api.setRouteIsDelayed('GET', '/non-existing', true)
			statusIsUnprocessable(r)
			equal(await r.text(), `Route does not exist: GET /non-existing`)
		})

		it('422 for invalid delayed value', async () => {
			const fx = new Fixture('set-route-delay.GET.200.json')
			await fx.sync()
			const r = await api.setRouteIsDelayed(fx.method, fx.urlMask, 'not-a-boolean')
			equal(await r.text(), 'Expected boolean for "delayed"')
			await fx.unlink()
		})

		it('200', async () => {
			const fx = new Fixture('set-route-delay.GET.200.json')
			await fx.sync()
			const r = await api.setRouteIsDelayed(fx.method, fx.urlMask, true)
			isTrue((await r.json()).delayed)
			await fx.unlink()
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

			const r = await request(`/non-existing-mock/${randomUUID()}`, {
				method: 'POST',
				body: reqBodyPayload
			})
			equal(r.status, 423)
			equal(r.headers.get('custom_header'), 'my_custom_header')
			equal(r.headers.get('set-cookie'), CUSTOM_COOKIES.join(', '))
			equal(await r.text(), reqBodyPayload)

			const savedBody = readFileSync(join(mocksDir, 'non-existing-mock/[id].POST.423.txt'), 'utf8')
			equal(savedBody, reqBodyPayload)
		})
	})

	describe('Set Proxy Fallback', () => {
		it('422 when value is not a valid URL', async () => {
			const r = await api.setProxyFallback('bad url')
			statusIsUnprocessable(r)
			equal(await r.text(), 'Invalid Proxy Fallback URL')
		})

		it('sets fallback', async () => {
			const r = await api.setProxyFallback('http://example.com')
			statusIsOk(r)
			equal((await fetchState()).proxyFallback, 'http://example.com')
		})

		it('unsets fallback', async () => {
			const r = await api.setProxyFallback('')
			statusIsOk(r)
			equal((await fetchState()).proxyFallback, '')
		})
	})

	describe('Set Collect Proxied', () => {
		it('422 for invalid collectProxied value', async () => {
			const r = await api.setCollectProxied('not-a-boolean')
			statusIsUnprocessable(r)
			equal(await r.text(), 'Expected a boolean for "collectProxied"')
		})

		it('200 set and unset', async () => {
			await api.setCollectProxied(true)
			isTrue((await fetchState()).collectProxied)

			await api.setCollectProxied(false)
			isFalse((await fetchState()).collectProxied)
		})
	})

	describe('Set Route is Proxied', () => {
		const fx = new Fixture('route-is-proxied.GET.200.json')
		beforeEach(async () => {
			await fx.sync()
			await api.setProxyFallback('')
		})
		after(async () => {
			await fx.unlink()
		})

		it('422 for non-existing route', async () => {
			const r = await api.setRouteIsProxied('GET', '/non-existing', true)
			statusIsUnprocessable(r)
			equal(await r.text(), `Route does not exist: GET /non-existing`)
		})

		it('422 for invalid proxied value', async () => {
			const r = await api.setRouteIsProxied(fx.method, fx.urlMask, 'not-a-boolean')
			statusIsUnprocessable(r)
			equal(await r.text(), 'Expected boolean for "proxied"')
		})

		it('422 for missing proxy fallback', async () => {
			const r = await api.setRouteIsProxied(fx.method, fx.urlMask, true)
			statusIsUnprocessable(r)
			equal(await r.text(), `There’s no proxy fallback`)
		})

		it('200 when setting', async () => {
			await api.setProxyFallback('https://example.com')
			const r0 = await api.setRouteIsProxied(fx.method, fx.urlMask, true)
			statusIsOk(r0)
			isTrue((await r0.json()).proxied)

			const r1 = await api.setRouteIsProxied(fx.method, fx.urlMask, false)
			statusIsOk(r1)
			isFalse((await r1.json()).proxied)
		})

		it('200 when unsetting', async () => {
			const r = await api.setRouteIsProxied(fx.method, fx.urlMask, false)
			statusIsOk(r)
			isFalse((await r.json()).proxied)
		})

		it('unsets auto500', async () => {
			const fx = new Fixture('unset-500-on-proxy.GET.200.txt')
			await fx.sync()
			await api.setProxyFallback('https://example.com')

			const r0 = await api.toggle500(fx.method, fx.urlMask)
			const b0 = await r0.json()
			isFalse(b0.proxied)
			isTrue(b0.auto500)

			const r1 = await api.setRouteIsProxied(fx.method, fx.urlMask, true)
			const b1 = await r1.json()
			isTrue(b1.proxied)
			isFalse(b1.auto500)

			await fx.unlink()
			await api.setProxyFallback('')
		})
	})

	it('updating selected mock resets proxied flag', async () => {
		const fx = new Fixture('select-resets-proxied.GET.200.txt')
		await fx.sync()
		await api.setProxyFallback('http://example.com')
		const r0 = await api.setRouteIsProxied(fx.method, fx.urlMask, true)
		isTrue((await r0.json()).proxied)

		const r1 = await api.select(fx.file)
		isFalse((await r1.json()).proxied)

		await api.setProxyFallback('')
		await fx.unlink()
	})
})


describe('404', () => {
	it('when there’s no mock', async () => {
		const r = await request('/non-existing')
		statusIsNotFound(r)
	})

	it('when there’s no mock at all for a method', async () => {
		const r = await request('/non-existing-too', { method: 'DELETE' })
		statusIsNotFound(r)
	})

	it('404s ignored files', async () => {
		const fx = new Fixture('ignored.GET.200.json~')
		await fx.write()
		await sync()
		const r = await fx.request()
		statusIsNotFound(r)
		await fx.unlink()
	})

	it('404s ignored static files', async () => {
		const fx = new FixtureStatic('static-ignored.js~')
		await fx.write()
		await sync()
		const r = await fx.request()
		statusIsNotFound(r)
		await fx.unlink()
	})
})


describe('Default Mock', () => {
	const fxA = new Fixture('alpha.GET.200.txt', 'A')
	const fxB = new Fixture('alpha(default).GET.200.txt', 'B')
	before(async () => {
		await fxA.write()
		await fxB.write()
		await sync()
	})
	after(async () => {
		await fxA.unlink()
		await fxB.unlink()
	})

	it('sorts mocks list with the user specified default first for dashboard display', async () => {
		const { mocks } = await fxA.fetchBroker()
		deepEqual(mocks, [
			fxB.file,
			fxA.file
		])
	})

	it('Dispatches default mock', async () => {
		const r = await fxA.request()
		equal(await r.text(), fxB.body)
	})
})


describe('Dynamic Mocks', () => {
	it('JS object is sent as JSON', async () => {
		const fx = new Fixture(
			'js-object.GET.200.js',
			'export default { FROM_JS: true }')
		await fx.sync()
		const r = await fx.request()
		equal(r.headers.get('content-type'), mimeFor('.json'))
		deepEqual(await r.json(), { FROM_JS: true })
		await fx.unlink()
	})

	it('TS array is sent as JSON', async () => {
		const fx = new Fixture(
			'js-object.GET.200.ts',
			'export default ["from ts"]')
		await fx.sync()
		const r = await fx.request()
		equal(r.headers.get('content-type'), mimeFor('.json'))
		deepEqual(await r.json(), ['from ts'])
		await fx.unlink()
	})
})


describe('Dynamic Function Mocks', () => {
	it('honors filename convention', async () => {
		const fx = new Fixture('func.GET.200.js', `
			export default function (req, response) {
  			return 'SOME_STRING_0'
			}`)
		await fx.sync()
		const r = await fx.request()
		statusIsOk(r)
		equal(r.headers.get('content-type'), mimeFor('.json'))
		equal(r.headers.get('set-cookie'), COOKIES.userA)
		equal(await r.text(), 'SOME_STRING_0')
		await fx.unlink()
	})

	it('can override filename convention (also supports TS)', async () => {
		const fx = new Fixture('func.POST.200.ts', `
			export default function (req, response) {
			  response.statusCode = 201
			  response.setHeader('content-type', 'custom-mime')
			  response.setHeader('set-cookie', 'custom-cookie')
			  return 'SOME_STRING_1'
			}`)
		await fx.sync()
		const r = await fx.request({ method: 'POST' })
		equal(r.status, 201)
		equal(r.headers.get('content-type'), 'custom-mime')
		equal(r.headers.get('set-cookie'), 'custom-cookie')
		equal(await r.text(), 'SOME_STRING_1')
		await fx.unlink()
	})
})


describe('Static Files', () => {
	const fxsIndex = new FixtureStatic('index.html', '<h1>Index</h1>')
	const fxsAsset = new FixtureStatic('asset-script.js', 'const a = 1')
	before(async () => {
		await fxsIndex.write()
		await fxsAsset.write()
		await sync()
	}) // the last test deletes them

	describe('Static File Serving', () => {
		it('Defaults to index.html', async () => {
			const r = await request('/')
			statusIsOk(r)
			equal(r.headers.get('content-type'), mimeFor(fxsIndex.file))
			equal(await r.text(), fxsIndex.body)
		})

		it('Serves exacts paths', async () => {
			const r = await fxsAsset.request()
			statusIsOk(r)
			equal(r.headers.get('content-type'), mimeFor(fxsAsset.file))
			equal(await r.text(), fxsAsset.body)
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
			const r = await api.setStaticRouteIsDelayed('/non-existing', true)
			statusIsUnprocessable(r)
			equal(await r.text(), `Static route does not exist: /non-existing`)
		})

		it('422 for invalid delayed value', async () => {
			const r = await api.setStaticRouteIsDelayed(fxsIndex.urlMask, 'not-a-boolean')
			equal(await r.text(), 'Expected boolean for "delayed"')
		})

		it('200', async () => {
			await api.setStaticRouteIsDelayed(fxsIndex.urlMask, true)
			const { staticBrokers } = await fetchState()
			isTrue(staticBrokers[fxsIndex.urlMask].delayed)
		})
	})

	describe('Set Static Route Status Code', () => {
		it('422 for non-existing route', async () => {
			const r = await api.setStaticRouteStatus('/non-existing', 200)
			statusIsUnprocessable(r)
			equal(await r.text(), `Static route does not exist: /non-existing`)
		})

		it('422 for invalid delayed value', async () => {
			const r = await api.setStaticRouteStatus(fxsIndex.urlMask, 'not-200-or-404')
			statusIsUnprocessable(r)
			equal(await r.text(), 'Expected 200 or 404 status code')
		})

		it('sets 404 and 200', async () => {
			await api.setStaticRouteStatus(fxsIndex.urlMask, 404)
			const r0 = await fxsIndex.request()
			statusIsNotFound(r0)

			await api.setStaticRouteStatus(fxsIndex.urlMask, 200)
			const r1 = await fxsIndex.request()
			statusIsOk(r1)
		})

		it('404s on a registered route but its file has been deleted', async () => {
			// Possible: (1) due to watcher delay. (2) or, when not-watching and deleting.
			const fx = new FixtureStatic('to-be-deleted.js')
			await fx.sync()
			await fx.unlink()
			const r = await fx.request()
			statusIsNotFound(r)
		})
	})

	describe('Static Partial Content', () => {
		it('206 serves partial content', async () => {
			await sync()
			const r0 = await fxsIndex.request({ headers: { range: 'bytes=0-3' } })
			const r1 = await fxsIndex.request({ headers: { range: 'bytes=4-' } })
			equal(r0.status, 206)
			equal(r1.status, 206)
			const body = await r0.text() + await r1.text()
			equal(body, fxsIndex.body)
		})

		it('416 on invalid range (end > start)', async () => {
			const r = await fxsIndex.request({ headers: { range: 'bytes=3-0' } })
			equal(r.status, 416)
		})
	})

	it('unregisters static route', async () => {
		await fxsIndex.unlink()
		await fxsAsset.unlink()
		await sync()
		const { staticBrokers } = await fetchState()
		isUndefined(staticBrokers[fxsIndex.urlMask])
		isUndefined(staticBrokers[fxsAsset.urlMask])
	})
})


describe('500', () => {
	it('toggling on 500 on a route without 500 auto-generates one', async () => {
		const fx = new Fixture('toggling-500-without-500.GET.200.json')
		await fx.sync()
		equal((await fx.request()).status, fx.status)

		const r0 = await api.toggle500(fx.method, fx.urlMask)
		isTrue((await r0.json()).auto500)
		equal((await fx.request()).status, 500)

		const r1 = await api.toggle500(fx.method, fx.urlMask)
		isFalse((await r1.json()).auto500)
		equal((await fx.request()).status, fx.status)
	})

	it('toggling on 500 picks existing 500', async () => {
		const fx200 = new Fixture('reg-error.GET.200.txt')
		const fx500 = new Fixture('reg-error.GET.500.txt')
		await fx200.write()
		await fx500.write()
		await sync()
		const r = await api.toggle500(fx200.method, fx200.urlMask)
		isFalse((await r.json()).auto500)
		equal(await (await fx200.request()).text(), fx500.body)
		await fx200.unlink()
		await fx500.unlink()
	})

	it('toggling 500 unsets `proxied` flag', async () => {
		const fx = new Fixture('proxied-to-500.GET.200.txt')
		await fx.sync()
		await api.setProxyFallback('http://example.com')
		await api.setRouteIsProxied(fx.method, fx.urlMask, true)
		await api.toggle500(fx.method, fx.urlMask)
		isFalse((await fx.fetchBroker()).proxied)
		await fx.unlink()
		await api.setProxyFallback('')
	})
})


describe('Index-like routes', () => {
	it('resolves dirs to the file without urlMask', async () => {
		const fx = new Fixture('.GET.200.json')
		await fx.sync()
		const r = await request('/')
		equal(await r.text(), fx.body)
		await fx.unlink()
	})
})


describe('MIME', () => {
	it('derives content-type from known mime', async () => {
		const fx = new Fixture('tmp.GET.200.json')
		await fx.sync()
		const r = await fx.request()
		equal(r.headers.get('content-type'), 'application/json')
		await fx.unlink()
	})

	it('derives content-type from custom mime', async () => {
		const fx = new Fixture(`tmp.GET.200.${CUSTOM_EXT}`)
		await fx.sync()
		const r = await fx.request()
		equal(r.headers.get('content-type'), CUSTOM_MIME)
		await fx.unlink()
	})
})


describe('Headers', () => {
	it('responses have version in "Server" header', async () => {
		const r = await api.getState()
		const val = r.headers.get('server')
		match(val, /^Mockaton \d+\.\d+\.\d+$/)
	})
	
	it('custom headers are included', async () => {
		const r = await api.getState()
		const val = r.headers.get(CUSTOM_HEADER_NAME)
		equal(val, CUSTOM_HEADER_VAL)
	})
})


describe('Method and Status', () => {
	const fx = new Fixture('uncommon-method.ACL.201.txt')
	before(async () => await fx.sync())
	after(async () => await fx.unlink())

	it('dispatches the response status', async () => {
		const r = await fx.request()
		equal(r.status, fx.status)
	})

	it('dispatches uncommon but supported methods', async () => {
		const r = await fx.request()
		equal(r.status, fx.status)
	})

	it('404s when method mismatches', async () => {
		const r = await fx.request({ method: 'POST' })
		statusIsNotFound(r)
	})
})


describe('Select', () => {
	const fx = new Fixture('select(default).GET.200.txt')
	const fxAlt = new Fixture('select(variant).GET.200.txt')
	const fxUnregistered = new Fixture('select(non-existing).GET.200.txt')
	before(async () => {
		await fx.write()
		await fxAlt.write()
		await sync()
	})
	after(async () => {
		await fx.unlink()
		await fxAlt.unlink()
	})

	it('422 when updating non-existing mock alternative', async () => {
		const r = await api.select(fxUnregistered.file)
		statusIsUnprocessable(r)
		equal(await r.text(), `Missing Mock: ${fxUnregistered.file}`)
	})

	it('selects variant', async () => {
		const r0 = await request('/select')
		equal(await r0.text(), fx.body)

		await api.select(fxAlt.file)
		const r1 = await request('/select')
		equal(await r1.text(), fxAlt.body)
	})
})


describe('Bulk Select', () => {
	const fxIota = new Fixture('iota.GET.200.txt')
	const fxIotaB = new Fixture('iota(comment B).GET.200.txt')
	const fxKappaA = new Fixture('kappa(comment A).GET.200.txt')
	const fxKappaB = new Fixture('kappa(comment B).GET.200.txt')
	before(async () => {
		await fxIota.write()
		await fxIotaB.write()
		await fxKappaA.write()
		await fxKappaB.write()
		await sync()
	})
	after(async () => {
		await fxIota.unlink()
		await fxIotaB.unlink()
		await fxKappaA.unlink()
		await fxKappaB.unlink()
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
		await sync()
		await api.bulkSelectByComment('(mment A)')
		equal((await (await fxKappaB.request()).text()), fxKappaA.body)
	})
})


describe('Decoding URLs', () => {
	it('allows dots, spaces, amp, etc.', async () => {
		const fx = new Fixture('dot.in.path and amp & and colon:.GET.200.txt')
		await fx.sync()
		const r = await fx.request()
		equal(await r.text(), fx.body)
		await fx.unlink()
	})
})


describe('Dynamic Params', () => {
	const fx0 = new Fixture('dynamic-params/[id]/.GET.200.txt')
	const fx1 = new Fixture('dynamic-params/[id]/suffix.GET.200.txt')
	const fx2 = new Fixture('dynamic-params/[id]/suffix/[id].GET.200.txt')
	const fx3 = new Fixture('dynamic-params/exact-route.GET.200.txt')
	before(async () => {
		mkdirSync(mocksDir + 'dynamic-params/[id]/suffix/[id]', { recursive: true })
		await fx0.write()
		await fx1.write()
		await fx2.write()
		await fx3.write()
		await sync()
	})
	after(async () => {
		await fx0.unlink()
		await fx1.unlink()
		await fx2.unlink()
		await fx3.unlink()
	})

	it('variable at end', async () => {
		const r = await fx0.request()
		equal(await r.text(), fx0.body)
	})

	it('sandwich variable present in another route at its end', async () => {
		const r = await fx1.request()
		equal(await r.text(), fx1.body)
	})

	it('sandwich fixed part in dynamic variables', async () => {
		const r = await fx2.request()
		equal(await r.text(), fx2.body)
	})

	it('ensure dynamic params do not take precedence over exact routes', async () => {
		const r = await fx3.request()
		equal(await r.text(), fx3.body)
	})
})


describe('Query String', () => {
	const fx0 = new Fixture('query-string?foo=[foo]&bar=[bar].GET.200.json')
	const fx1 = new Fixture('query-string/[id]?limit=[limit].GET.200.json')
	before(async () => {
		mkdirSync(mocksDir + 'query-string', { recursive: true })
		await fx0.write()
		await fx1.write()
		await sync()
	})
	after(async () => {
		await fx0.unlink()
		await fx1.unlink()
	})

	it('multiple params', async () => {
		const r = await fx0.request()
		equal(await r.text(), fx0.body)
	})
	it('with pretty-param and without query-params', async () => {
		const r = await request('/query-string/1234')
		equal(await r.text(), fx1.body)
	})
	it('with pretty-param and without query-params, but with trailing slash and "?"', async () => {
		const r = await request('/query-string/1234/?')
		equal(await r.text(), fx1.body)
	})
	it('with pretty-param and query-params', async () => {
		const r = await request('/query-string/1234/?limit=4')
		equal(await r.text(), fx1.body)
	})
})


it('head for get. returns the headers without body only for GETs requested as HEAD', async () => {
	const fx = new Fixture('head-get.GET.200.json')
	await fx.sync()
	const r = await fx.request({ method: 'HEAD' })
	statusIsOk(r)
	equal(r.headers.get('content-length'), String(Buffer.byteLength(fx.body)))
	equal(await r.text(), '')
	await fx.unlink()
})


describe('Registering Non-Static Mocks', () => {
	before(() => {
		watchMocksDir()
		watchStaticDir()
	})

	const fxA = new Fixture('register(default).GET.200.json')
	const fxB = new Fixture('register(alt).GET.200.json')

	it('register', async () => {
		await fxA.register()
		await fxB.register()
		const b = await fxA.fetchBroker()
		deepEqual(b.mocks, [fxA.file, fxB.file])
	})

	it('unregistering selected ensures a mock is selected', async () => {
		await api.select(fxA.file)
		await fxA.unregister()
		const b = await fxA.fetchBroker()
		deepEqual(b.mocks, [fxB.file])
	})

	it('unregistering the last mock removes broker', async () => {
		await fxB.unregister()
		const b = await fxB.fetchBroker()
		isUndefined(b)
	})
	
	it('registering a 500 unsets auto500', async () => {
		const fx200 = new Fixture('reg-error.GET.200.txt')
		const fx500 = new Fixture('reg-error.GET.500.txt')
		await fx200.register()
		await api.toggle500(fx200.method, fx200.urlMask)
		const b0 = await fx200.fetchBroker()
		isTrue(b0.auto500)
		await fx500.register()
		const b1 = await fx200.fetchBroker()
		isFalse(b1.auto500)
		deepEqual(b1.mocks, [
			fx200.file,
			fx500.file
		])
		await fx200.unregister()
		await fx500.unregister()
	})

	// TODO @ThinkAbout testing debounced bulk additions or removals
	describe('getSyncVersion', () => {
		let version

		it('getSyncVersion responds immediately when version mismatches', async () => {
			const r = await api.getSyncVersion(-1)
			version = await r.json()
		})

		const fx = new Fixture('runtime1.GET.200.txt')
		it('responds when a file is added', async () => {
			const prom = api.getSyncVersion(version)
			await fx.write()
			const r = await prom
			equal(await r.json(), version + 1)
		})

		it('responds when a file is deleted', async () => {
			const prom = api.getSyncVersion(version + 1)
			await fx.unlink()
			const r = await prom
			equal(await r.json(), version + 2)
		})
	})
})


describe('Registering Static Mocks', () => {
	const fx = new FixtureStatic('static-register.txt')

	it('registers static', async () => {
		await fx.register()
		const { staticBrokers } = await fetchState()
		deepEqual(staticBrokers, {
			['/' + fx.file]: {
				route: '/' + fx.file,
				status: 200,
				delayed: false
			}
		})
	})

	it('unregisters static', async () => {
		await fx.unregister()
		const { staticBrokers } = await fetchState()
		deepEqual(staticBrokers, {})
	})
})



// # Utils

function isTrue(val) { equal(val, true) }
function isFalse(val) { equal(val, false) }
function isUndefined(val) { equal(val, undefined) }

function statusIsOk(response) { equal(response.status, 200) }
function statusIsNotFound(response) { equal(response.status, 404) }
function statusIsUnprocessable(response) { equal(response.status, 422) }


