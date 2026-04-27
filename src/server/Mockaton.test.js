import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { createServer } from 'node:http'
import { mkdtempSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { equal, deepEqual, match } from 'node:assert/strict'
import { describe, test, before, beforeEach, after } from 'node:test'
import { unlink, mkdir, readFile, rename, readdir, writeFile, rm } from 'node:fs/promises'

import { mimeFor } from './utils/mime.js'
import { parseFilename } from '../client/Filename.js'
import { API, Commander } from '../../index.js'

import CONFIG from './Mockaton.test.config.js'
import { config } from './config.js'


const mocksDir = mkdtempSync(join(tmpdir(), 'mocks'))

const stdout = []
const stderr = []
const proc = spawn(join(import.meta.dirname, 'cli.js'), [
	mocksDir,
	'--config', join(import.meta.dirname, 'Mockaton.test.config.js'),
	'--no-open'
])

const DEBUG = false
proc.stdout.on('data', data => {
	stdout.push(data.toString())
	DEBUG && process.stdout.write(stdout.at(-1))
})
proc.stderr.on('data', data => {
	stderr.push(data.toString())
	DEBUG && process.stderr.write(stderr.at(-1))
})

const serverAddr = await new Promise((resolve, reject) => {
	proc.stdout.once('data', () => {
		const addr = stdout[0].match(/Listening::(http:[^\n]+)/)[1]
		resolve(addr)
	})
	proc.on('error', reject)
})

after(() => proc.kill('SIGUSR2'))


const rmFromMocksDir = f => unlink(join(mocksDir, f))
const readFromMocksDir = f => readFile(join(mocksDir, f), 'utf8')
const writeInMocksDir = (f, data) => writeFile(join(mocksDir, f), data)
const renameInMocksDir = (src, target) => rename(join(mocksDir, src), join(mocksDir, target))

const listFromMocksDir = d => readdir(join(mocksDir, d))
const rmDirFromMocks = d => rm(join(mocksDir, d), { recursive: true })
const makeDirInMocks = dir => mkdir(join(mocksDir, dir), { recursive: true })


const api = new Commander(serverAddr)


/** @returns {Promise<State>} */
async function fetchState() {
	return (await api.getState()).json()
}

function request(path, options = {}) {
	return fetch(api.addr + path, options)
}


class Fixture {
	constructor(file, body = '') {
		this.file = file
		this.body = body || `Body for: ${file}`
		const t = parseFilename(file)
		this.urlMask = t.urlMask
		this.method = t.method
		this.status = t.status
		this.ext = t.ext
	}
	async fetchBroker() {
		return (await fetchState()).brokersByMethod?.[this.method]?.[this.urlMask]
	}
	write() { return api.writeMock(this.file, this.body) }
	delete() { return api.deleteMock(this.file) }

	request(options = {}) {
		options.method ??= this.method
		return request(this.urlMask, options)
	}
}



describe('Windows', () => {
	test('path separators are normalized to forward slashes', async () => {
		const fx = new Fixture('win-paths.GET.200.json')
		await fx.write()
		const b = await fx.fetchBroker()
		equal(b.file, fx.file)
		await fx.delete()
	})
})


describe('Rejects malicious URLs', () => {
	[
		['double-encoded', 400, `/${encodeURIComponent(encodeURIComponent('/'))}user`],
		['encoded null byte', 400, '/user%00/admin'],
		['invalid percent-encoding', 400, '/user%ZZ'],
		['encoded CRLF sequence', 400, '/user%0d%0aSet-Cookie:%20x=1'],
		['overlong/illegal UTF-8 sequence', 400, '/user%C0%AF'],
		['double-double-encoding trick', 400, '/%25252Fuser'],
		['zero-width/invisible char', 404, '/user%E2%80%8Binfo'],
		['encoded path traversal', 404, '/user/..%2Fadmin'],
		['raw path traversal', 404, '/../user'],
		['very long path', 414, '/'.repeat(2048 + 1)]
	]
		.forEach(([title, status, url]) => test(title, async () =>
			equal((await request(url)).status, status)))
})


describe('Filename Convention', () => {
	test('registers invalid filenames as GET 200', async () => {
		await api.reset()
		const fx0 = new Fixture('bar.GET._INVALID_STATUS_.json')
		const fx1 = new Fixture('foo._INVALID_METHOD_.202.json')
		const fx2 = new Fixture('missing-method-and-status.json')
		await fx0.write()
		await fx1.write()
		await fx2.write()

		const s = await fetchState()
		equal(s.brokersByMethod.GET['/bar.GET._INVALID_STATUS_.json'].file, 'bar.GET._INVALID_STATUS_.json')
		equal(s.brokersByMethod.GET['/foo._INVALID_METHOD_.202.json'].file, 'foo._INVALID_METHOD_.202.json')
		equal(s.brokersByMethod.GET['/missing-method-and-status.json'].file, 'missing-method-and-status.json')

		await fx0.delete()
		await fx1.delete()
		await fx2.delete()
	})

	test('body parser rejects invalid JSON in API requests', async () => {
		const r = await request(API.cookies, {
			method: 'PATCH',
			body: '[invalid_json]'
		})
		equal(r.status, 422)
		equal(await r.text(), 'BodyReaderError: Could not parse')
	})

	test('returns 500 when a handler throws', async () => {
		const r = await request(API.throws)
		equal(r.status, 500)
		match(stderr.at(-1), /Test500/)
	})
})


describe('CORS', () => {
	describe('Set CORS allowed', () => {
		test('422 for non boolean', async () => {
			const r = await api.setCorsAllowed('not-a-boolean')
			equal(r.status, 422)
			equal(await r.text(), 'Expected Boolean')
		})

		test('200', async () => {
			const r = await api.setCorsAllowed(true)
			equal(r.status, 200)
			equal((await fetchState()).corsAllowed, true)

			await api.setCorsAllowed(false)
			equal((await fetchState()).corsAllowed, false)
		})
	})

	test('preflights', async () => {
		await api.setCorsAllowed(true)
		const r = await request('/does-not-matter', {
			method: 'OPTIONS',
			headers: {
				'origin': CONFIG.corsOrigins[0],
				'access-control-request-method': 'GET'
			}
		})
		equal(r.status, 204)
		equal(r.headers.get('access-control-allow-origin'), CONFIG.corsOrigins[0])
		equal(r.headers.get('access-control-allow-methods'), 'GET')
	})

	test('responds', async () => {
		const fx = new Fixture('cors-response.GET.200.json')
		await fx.write()
		const r = await fx.request({
			headers: {
				'origin': CONFIG.corsOrigins[0]
			}
		})
		equal(r.status, 200)
		equal(r.headers.get('access-control-allow-origin'), CONFIG.corsOrigins[0])
		equal(r.headers.get('access-control-expose-headers'), 'Content-Encoding')
		await fx.delete()
	})
})


describe('Dashboard', () => {
	test('renders', async () => {
		const r = await request(API.dashboard)
		match(await r.text(), new RegExp('<!DOCTYPE html>'))
	})

	test('query string is accepted', async () => {
		const r = await request(API.dashboard + '?foo=bar')
		match(await r.text(), new RegExp('<!DOCTYPE html>'))
	})

	test('serves assets', async () => {
		const r = await request(API.dashboard + '/app.css')
		match(await r.text(), new RegExp(':root {'))
	})
})


describe('OpenAPI', () => {
	test('serves the json spec', async () => {
		const r = await request(API.openAPI)
		match(await r.text(), new RegExp('"openapi":'))
	})
})


describe('Cookie', () => {
	test('422 when trying to select non-existing cookie', async () => {
		const r = await api.selectCookie('non-existing-cookie-key')
		equal(r.status, 422)
	})

	test('defaults to the first key:value', async () =>
		deepEqual((await fetchState()).cookies, [
			['userA', true],
			['userB', false]
		]))

	test('updates selected cookie', async () => {
		const fx = new Fixture('update-cookie.GET.200.json')
		await fx.write()
		const resA = await fx.request()
		equal(resA.headers.get('set-cookie'), CONFIG.cookies.userA)

		const response = await api.selectCookie('userB')
		deepEqual(await response.json(), [
			['userA', false],
			['userB', true]
		])

		const resB = await fx.request()
		equal(resB.headers.get('set-cookie'), CONFIG.cookies.userB)
		await fx.delete()
	})
})


describe('Delay', () => {
	describe('Set Global Delay', () => {
		test('422 for invalid value', async () => {
			const r = await api.setGlobalDelay('not-a-number')
			equal(r.status, 422)
			equal(await r.text(), 'Expected an integer between 0 and 120000')
		})
		test('200 for valid global delay value', async () => {
			const r = await api.setGlobalDelay(150)
			equal(r.status, 200)
			equal((await fetchState()).delay, 150)
		})
	})

	describe('Set Global Delay Jitter', () => {
		test('422 for invalid value', async () => {
			const r = await api.setGlobalDelayJitter('not-a-number')
			equal(r.status, 422)
			equal(await r.text(), 'Expected a float between 0 and 3')
		})
		test('200 for valid value', async () => {
			const r = await api.setGlobalDelayJitter(0.1)
			equal(r.status, 200)
			equal((await fetchState()).delayJitter, 0.1)
		})
	})

	test('updates route delay', async () => {
		const fx = new Fixture('route-delay.GET.200.json')
		await fx.write()
		const DELAY = 100
		await api.setGlobalDelay(DELAY)
		await api.setRouteIsDelayed(fx.method, fx.urlMask, true)
		const t0 = performance.now()
		const r = await fx.request()
		equal(await r.text(), fx.body)
		equal(performance.now() - t0 > DELAY, true)
		await fx.delete()
	})

	describe('Set Route is Delayed', () => {
		test('422 for non-existing route', async () => {
			const r = await api.setRouteIsDelayed('GET', '/non-existing', true)
			equal(r.status, 422)
			equal(await r.text(), `Route does not exist: GET /non-existing`)
		})

		test('422 for invalid delayed value', async () => {
			const fx = new Fixture('set-route-delay.GET.200.json')
			await fx.write()
			const r = await api.setRouteIsDelayed(fx.method, fx.urlMask, 'not-a-boolean')
			equal(await r.text(), 'Expected boolean for "delayed"')
			await fx.delete()
		})

		test('200', async () => {
			const fx = new Fixture('set-route-delay.GET.200.json')
			await fx.write()
			const r = await api.setRouteIsDelayed(fx.method, fx.urlMask, true)
			equal((await r.json()).delayed, true)
			await fx.delete()
		})
	})
})


describe('Proxy Fallback', () => {
	describe('Fallback', () => {
		let fallbackServer
		const CUSTOM_COOKIES = ['cookieX=x', 'cookieY=y']
		const BODY_PAYLOAD = { a: 'b' }
		const expectedBody = JSON.stringify(BODY_PAYLOAD, null, '  ') // config.formatCollectedJSON=true

		before(async () => {
			fallbackServer = createServer(async (req, response) => {
				response.writeHead(423, {
					'custom_header': 'my_custom_header',
					'content-type': mimeFor('.json'),
					'set-cookie': CUSTOM_COOKIES,
					'cache-control': 'public'
				})
				response.end(JSON.stringify(BODY_PAYLOAD))
			})
			await promisify(fallbackServer.listen).bind(fallbackServer, 0, '127.0.0.1')()
			await api.setProxyFallback(`http://localhost:${fallbackServer.address().port}`)
			await api.setCollectProxied(true)
		})

		after(() => fallbackServer.close())

		test('Relays to fallback server and saves the mock (we req twice, so the second one gets a unique comment)', async () => {
			const r1 = await request(`/non-existing-mock/${randomUUID()}`, { method: 'POST' })
			const r2 = await request(`/non-existing-mock/${randomUUID()}`, { method: 'POST' })

			equal(r1.status, 423)
			equal(r2.status, 423)

			equal(r1.headers.get('custom_header'), 'my_custom_header')
			equal(r2.headers.get('custom_header'), 'my_custom_header')

			equal(r1.headers.get('set-cookie'), CUSTOM_COOKIES.join(', '))
			equal(r2.headers.get('set-cookie'), CUSTOM_COOKIES.join(', '))

			equal(r1.headers.get('cache-control'), 'no-cache') // unsets cache
			equal(r2.headers.get('cache-control'), 'no-cache')

			deepEqual(await r2.json(), BODY_PAYLOAD)
			deepEqual(await r1.json(), BODY_PAYLOAD)

			const savedMocks = await listFromMocksDir('non-existing-mock')
			equal(savedMocks.length, 2)

			equal(await readFromMocksDir('non-existing-mock/[id].POST.423.json'), expectedBody)
			for (const m of savedMocks) {
				const f = join('non-existing-mock', m)
				equal(await readFromMocksDir(f), expectedBody)
				await rmFromMocksDir(f)
			}
		})
	})

	describe('Set Proxy Fallback', () => {
		test('422 when value is not a valid URL', async () => {
			const r = await api.setProxyFallback('bad url')
			equal(r.status, 422)
			equal(await r.text(), 'Expected an empty String or URL')
		})

		test('sets fallback', async () => {
			const r = await api.setProxyFallback('https://example.test')
			equal(r.status, 200)
			equal((await fetchState()).proxyFallback, 'https://example.test')
		})

		test('unsets fallback', async () => {
			const r = await api.setProxyFallback('')
			equal(r.status, 200)
			equal((await fetchState()).proxyFallback, '')
		})
	})

	describe('Set Collect Proxied', () => {
		test('422 for invalid collectProxied value', async () => {
			const r = await api.setCollectProxied('not-a-boolean')
			equal(r.status, 422)
			equal(await r.text(), 'Expected Boolean')
		})

		test('200 set and unset', async () => {
			await api.setCollectProxied(true)
			equal((await fetchState()).collectProxied, true)

			await api.setCollectProxied(false)
			equal((await fetchState()).collectProxied, false)
		})
	})

	describe('Set Route is Proxied', () => {
		const fx = new Fixture('route-is-proxied.GET.200.json')
		beforeEach(async () => {
			await fx.write()
			await api.setProxyFallback('')
		})
		after(async () => {
			await fx.delete()
		})

		test('422 for non-existing route', async () => {
			const r = await api.setRouteIsProxied('GET', '/non-existing', true)
			equal(r.status, 422)
			equal(await r.text(), `Route does not exist: GET /non-existing`)
		})

		test('422 for invalid proxied value', async () => {
			const r = await api.setRouteIsProxied(fx.method, fx.urlMask, 'not-a-boolean')
			equal(r.status, 422)
			equal(await r.text(), 'Expected boolean for "proxied"')
		})

		test('422 for missing proxy fallback', async () => {
			const r = await api.setRouteIsProxied(fx.method, fx.urlMask, true)
			equal(r.status, 422)
			equal(await r.text(), `There’s no proxy fallback`)
		})

		test('200 when setting', async () => {
			await api.setProxyFallback('https://example.test')
			const r0 = await api.setRouteIsProxied(fx.method, fx.urlMask, true)
			equal(r0.status, 200)
			equal((await r0.json()).proxied, true)

			const r1 = await api.setRouteIsProxied(fx.method, fx.urlMask, false)
			equal(r1.status, 200)
			equal((await r1.json()).proxied, false)
		})

		test('200 when unsetting', async () => {
			const r = await api.setRouteIsProxied(fx.method, fx.urlMask, false)
			equal(r.status, 200)
			equal((await r.json()).proxied, false)
		})

		test('unsets autoStatus', async () => {
			const fx = new Fixture('unset-500-on-proxy.GET.200.txt')
			await fx.write()
			await api.setProxyFallback('https://example.test')

			const r0 = await api.toggleStatus(fx.method, fx.urlMask, 500)
			const b0 = await r0.json()
			equal(b0.proxied, false)
			equal(b0.autoStatus, 500)

			const r1 = await api.setRouteIsProxied(fx.method, fx.urlMask, true)
			const b1 = await r1.json()
			equal(b1.proxied, true)
			equal(b1.autoStatus, 0)

			await fx.delete()
			await api.setProxyFallback('')
		})
	})

	test('updating selected mock resets proxied flag', async () => {
		const fx = new Fixture('select-resets-proxied.GET.200.txt')
		await fx.write()
		await api.setProxyFallback('https://example.test')
		const r0 = await api.setRouteIsProxied(fx.method, fx.urlMask, true)
		equal((await r0.json()).proxied, true)

		const r1 = await api.select(fx.file)
		equal((await r1.json()).proxied, false)

		await api.setProxyFallback('')
		await fx.delete()
	})
})


describe('404', () => {
	test('when there’s no mock', async () => {
		const r = await request('/non-existing')
		equal(r.status, 404)
	})

	test('when there’s no mock at all for a method', async () => {
		const r = await request('/non-existing-too', { method: 'DELETE' })
		equal(r.status, 404)
	})

	test('404s ignored files', async () => {
		const fx = new Fixture('ignored.GET.200.json~')
		await fx.write()
		const r = await fx.request()
		equal(r.status, 404)
		await fx.delete()
	})
})


describe('Default Mock', () => {
	const fxA = new Fixture('alpha.GET.200.txt', 'A')
	const fxB = new Fixture('alpha(default).GET.200.txt', 'B')
	before(async () => {
		await fxA.write()
		await fxB.write()
		await api.reset()
	})
	after(async () => {
		await fxA.delete()
		await fxB.delete()
	})

	test('sorts mocks list with the user specified default first for dashboard display', async () => {
		const { mocks } = await fxA.fetchBroker()
		deepEqual(mocks, [
			fxB.file,
			fxA.file
		])
	})

	test('Dispatches default mock', async () => {
		const r = await fxA.request()
		equal(await r.text(), fxB.body)
	})
})


describe('Dynamic Mocks', () => {
	test('JS object is sent as JSON', async () => {
		const fx = new Fixture(
			'js-object.GET.200.js',
			'export default { FROM_JS: true }')
		await fx.write()
		const r = await fx.request()
		equal(r.headers.get('content-type'), mimeFor('.json'))
		deepEqual(await r.json(), { FROM_JS: true })
		await fx.delete()
	})

	test('TS array is sent as JSON', async () => {
		const fx = new Fixture(
			'js-object.GET.200.ts',
			'export default ["from ts"]')
		await fx.write()
		const r = await fx.request()
		equal(r.headers.get('content-type'), mimeFor('.json'))
		deepEqual(await r.json(), ['from ts'])
		await fx.delete()
	})
})


describe('Dynamic Function Mocks', () => {
	test('honors filename convention', async () => {
		const fx = new Fixture('func.GET.200.js', `
			export default function (req, response) {
  			return Buffer.from('A')
			}`)
		await fx.write()
		const r = await fx.request()
		equal(r.status, 200)
		equal(r.headers.get('content-length'), '1')
		equal(r.headers.get('content-type'), mimeFor('.json'))
		equal(r.headers.get('set-cookie'), CONFIG.cookies.userA)
		equal(await r.text(), 'A')
		await fx.delete()
	})

	test('can override filename convention (also supports TS)', async () => {
		const fx = new Fixture('func.POST.200.ts', `
			export default function (req, response) {
			  response.statusCode = 201
			  response.setHeader('content-type', 'custom-mime')
			  response.setHeader('set-cookie', 'custom-cookie')
			  return new Uint8Array([65, 65])
			}`)
		await fx.write()
		const r = await fx.request({ method: 'POST' })
		equal(r.status, 201)
		equal(r.headers.get('content-length'), String(2))
		equal(r.headers.get('content-type'), 'custom-mime')
		equal(r.headers.get('set-cookie'), 'custom-cookie')
		equal(await r.text(), 'AA')
		await fx.delete()
	})
})


describe('Static Files', () => {
	const fxsIndex = new Fixture('index.html', '<h1>Index</h1>')
	const fxsAsset = new Fixture('asset-script.js', 'const a = 1')
	before(async () => {
		await api.reset()
		await fxsIndex.write()
		await fxsAsset.write()
	})

	describe('Static File Serving', () => {
		test('Defaults to index.html', async () => {
			const r = await request('/')
			equal(r.status, 200)
			equal(r.headers.get('content-type'), mimeFor(fxsIndex.file))
			equal(await r.text(), fxsIndex.body)
		})

		test('Serves exacts paths', async () => {
			const r = await fxsAsset.request()
			equal(r.status, 200)
			equal(r.headers.get('content-type'), mimeFor(fxsAsset.file))
			equal(await r.text(), fxsAsset.body)
		})
	})

	test('are part of the normal mocks list', async () => {
		const s = await fetchState()
		equal(s.brokersByMethod.GET[fxsAsset.urlMask].file, fxsAsset.file)
		equal(s.brokersByMethod.GET[fxsIndex.urlMask].file, fxsIndex.file)
	})

	describe('Static Partial Content', () => {
		test('206 serves partial content', async () => {
			await api.reset()
			const r0 = await fxsIndex.request({ headers: { range: 'bytes=0-3' } })
			const r1 = await fxsIndex.request({ headers: { range: 'bytes=4-' } })
			equal(r0.status, 206)
			equal(r1.status, 206)
			const body = await r0.text() + await r1.text()
			equal(body, fxsIndex.body)
		})

		test('416 on invalid range (end > start)', async () => {
			const r = await fxsIndex.request({ headers: { range: 'bytes=3-0' } })
			equal(r.status, 416)
		})
	})

	test('unregisters static route', async () => {
		await api.reset()
		await fxsIndex.delete()
		await fxsAsset.delete()
		const s = await fetchState()
		equal(s.brokersByMethod.GET?.[fxsIndex.urlMask], undefined)
		equal(s.brokersByMethod.GET?.[fxsAsset.urlMask], undefined)
	})
})


describe('Auto Status', () => {
	test('toggling ON 500 on a route without 500 auto-generates one', async () => {
		const fx = new Fixture('toggling-500-without-500.GET.200.json')
		await fx.write()
		equal((await fx.request()).status, fx.status)

		const bp0 = await api.toggleStatus(fx.method, fx.urlMask, 500)
		const b0 = await bp0.json()
		equal(b0.autoStatus, 500)
		equal(b0.status, 500)
		equal((await fx.request()).status, 500)

		const r1 = await api.toggleStatus(fx.method, fx.urlMask, 500)
		equal((await r1.json()).autoStatus, 0)
		equal((await fx.request()).status, fx.status)
	})

	test('toggling ON 500 picks existing 500 and toggling OFF selects default', async () => {
		await api.reset()
		const fx200 = new Fixture('reg-error.GET.200.txt')
		const fx500 = new Fixture('reg-error.GET.500.txt')
		await fx200.write()
		await fx500.write()

		const bp0 = await api.toggleStatus(fx200.method, fx200.urlMask, 500)
		const b0 = await bp0.json()
		equal(b0.autoStatus, 0)
		equal(b0.status, 500)
		equal(await (await fx200.request()).text(), fx500.body)

		const bp1 = await api.toggleStatus(fx200.method, fx200.urlMask, 500)
		const b1 = await bp1.json()
		equal(b0.autoStatus, 0)
		equal(b1.status, 200)
		equal(await (await fx200.request()).text(), fx200.body)

		await fx200.delete()
		await fx500.delete()
	})

	test('toggling ON 500 unsets `proxied` flag', async () => {
		const fx = new Fixture('proxied-to-500.GET.200.txt')
		await fx.write()
		await api.setProxyFallback('https://example.test')
		await api.setRouteIsProxied(fx.method, fx.urlMask, true)
		await api.toggleStatus(fx.method, fx.urlMask, 500)
		equal((await fx.fetchBroker()).proxied, false)
		await fx.delete()
		await api.setProxyFallback('')
	})

	test('toggling ON 404 for static routes', async () => {
		const fx = new Fixture('static-404.txt')
		await fx.write()
		equal((await fx.request()).status, 200)

		const bp0 = await api.toggleStatus(fx.method, fx.urlMask, 404)
		const b0 = await bp0.json()
		equal(b0.autoStatus, 404)
		equal(b0.status, 404)
		equal((await fx.request()).status, 404)

		const r1 = await api.toggleStatus(fx.method, fx.urlMask, 404)
		equal((await r1.json()).autoStatus, 0)
		equal((await fx.request()).status, 200)

		await fx.delete()
	})
})


describe('Index-like routes', () => {
	test('resolves dirs to the file without urlMask', async () => {
		const fx = new Fixture('.GET.200.json')
		await fx.write()
		const r = await request('/')
		equal(await r.text(), fx.body)
		await fx.delete()
	})
})


describe('MIME', () => {
	test('derives content-type from known mime', async () => {
		const fx = new Fixture('tmp.GET.200.json')
		await fx.write()
		const r = await fx.request()
		equal(r.headers.get('content-type'), 'application/json')
		await fx.delete()
	})

	test('derives content-type from custom mime', async () => {
		const ext = Object.keys(CONFIG.extraMimes)[0]
		const mime = Object.values(CONFIG.extraMimes)[0]
		const fx = new Fixture(`tmp.GET.200.${ext}`)
		await fx.write()
		const r = await fx.request()
		equal(r.headers.get('content-type'), mime)
		await fx.delete()
	})
})


describe('Headers', () => {
	test('api responses have version in "Server" header', async () => {
		const r = await api.getState()
		const val = r.headers.get('server')
		match(val, /^Mockaton \d+\.\d+\.\d+$/)
	})

	test('mock responses have version in "Server" header and custom headers', async () => {
		const fx = new Fixture('header.GET.200.json')
		await fx.write()
		const r = await fx.request()
		match(r.headers.get('server'), /^Mockaton \d+\.\d+\.\d+$/)
		equal(r.headers.get(CONFIG.extraHeaders[0]), CONFIG.extraHeaders[1])
	})
})


describe('Method and Status', () => {
	const fx = new Fixture('uncommon-method.ACL.201.txt')
	before(async () => await fx.write())
	after(async () => await fx.delete())

	test('dispatches the response status', async () => {
		const r = await fx.request()
		equal(r.status, fx.status)
	})

	test('dispatches uncommon but supported methods', async () => {
		const r = await fx.request()
		equal(r.status, fx.status)
	})

	test('404s when method mismatches', async () => {
		const r = await fx.request({ method: 'POST' })
		equal(r.status, 404)
	})
})


describe('Select', () => {
	const fx = new Fixture('select(default).GET.200.txt')
	const fxAlt = new Fixture('select(variant).GET.200.txt')
	const fxUnregistered = new Fixture('select(non-existing).GET.200.txt')
	before(async () => {
		await fx.write()
		await fxAlt.write()
	})
	after(async () => {
		await fx.delete()
		await fxAlt.delete()
	})

	test('422 when updating non-existing mock', async () => {
		const file = 'route-does-not-exist.GET.200.txt'
		const r = await api.select(file)
		equal(r.status, 422)
		equal(await r.text(), `Missing Mock: ${file}`)
	})

	test('422 when updating non-existing mock alternative but there are other mocks for the route', async () => {
		const r = await api.select(fxUnregistered.file)
		equal(r.status, 422)
		equal(await r.text(), `Missing Mock: ${fxUnregistered.file}`)
	})

	test('selects variant', async () => {
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
	})
	after(async () => {
		await fxIota.delete()
		await fxIotaB.delete()
		await fxKappaA.delete()
		await fxKappaB.delete()
	})

	test('extracts all comments without duplicates', async () =>
		deepEqual((await fetchState()).comments, [
			'(comment A)',
			'(comment B)',
		]))

	test('selects exact', async () => {
		await api.bulkSelectByComment('(comment B)')
		equal((await (await fxIota.request()).text()), fxIotaB.body)
		equal((await (await fxKappaA.request()).text()), fxKappaB.body)
	})

	test('selects partial', async () => {
		await api.reset()
		await api.bulkSelectByComment('(mment A)')
		equal((await (await fxKappaB.request()).text()), fxKappaA.body)
	})
})


describe('Decoding URLs', () => {
	test('allows dots, spaces, amp, etc.', async () => {
		const fx = new Fixture('dot.in.path and amp & and colon:.GET.200.txt')
		await fx.write()
		equal(await (await fx.request()).text(), fx.body)
		await fx.delete()
	})
})


describe('Dynamic Params', () => {
	const fx0 = new Fixture('dynamic-params/[id]/.GET.200.txt')
	const fx1 = new Fixture('dynamic-params/[id]/suffix.GET.200.txt')
	const fx2 = new Fixture('dynamic-params/[id]/suffix/[id].GET.200.txt')
	const fx3 = new Fixture('dynamic-params/exact-route.GET.200.txt')
	before(async () => {
		await makeDirInMocks('dynamic-params/[id]/suffix/[id]')
		await fx0.write()
		await fx1.write()
		await fx2.write()
		await fx3.write()
	})
	after(async () => {
		await fx0.delete()
		await fx1.delete()
		await fx2.delete()
		await fx3.delete()
	})

	test('variable at end', async () => {
		const r = await fx0.request()
		equal(await r.text(), fx0.body)
	})

	test('sandwich variable present in another route at its end', async () => {
		const r = await fx1.request()
		equal(await r.text(), fx1.body)
	})

	test('sandwich fixed part in dynamic variables', async () => {
		const r = await fx2.request()
		equal(await r.text(), fx2.body)
	})

	test('ensure dynamic params do not take precedence over exact routes', async () => {
		const r = await fx3.request()
		equal(await r.text(), fx3.body)
	})
})

test('Dynamic Params on partial segments', async () => {
	const fx = new Fixture('dynamic-params-partial-[id]/foo.GET.200.txt')
	await makeDirInMocks('dynamic-params-partial-[id]')
	await fx.write()
	const r = await request('/dynamic-params-partial-999/foo')
	equal(await r.text(), fx.body)
	await fx.delete()
})


describe('Query String', () => {
	const fx0 = new Fixture('query-string?foo=[foo]&bar=[bar].GET.200.json')
	const fx1 = new Fixture('query-string/[id]?limit=[limit].GET.200.json')
	before(async () => {
		await makeDirInMocks('query-string')
		await fx0.write()
		await fx1.write()
		await api.reset()
	})
	after(async () => {
		await fx0.delete()
		await fx1.delete()
	})

	test('multiple params', async () => {
		const r = await fx0.request()
		equal(await r.text(), fx0.body)
	})
	test('with pretty-param and without query-params', async () => {
		const r = await request('/query-string/1234')
		equal(await r.text(), fx1.body)
	})
	test('with pretty-param and without query-params, but with trailing slash and "?"', async () => {
		const r = await request('/query-string/1234/?')
		equal(await r.text(), fx1.body)
	})
	test('with pretty-param and query-params', async () => {
		const r = await request('/query-string/1234/?limit=4')
		equal(await r.text(), fx1.body)
	})
})


test('head for get. returns the headers without body only for GETs requested as HEAD', async () => {
	const fx = new Fixture('head-get.GET.200.json')
	await fx.write()
	const r = await fx.request({ method: 'HEAD' })
	equal(r.status, 200)
	equal(r.headers.get('content-length'), String(Buffer.byteLength(fx.body)))
	equal(await r.text(), '')
	await fx.delete()
})


describe('Write and Delete Mock', () => {
	test('rejects filenames resolving outside mocksDir', async () => {
		const r = await api.writeMock('../outside.txt', '')
		equal(r.status, 403)
		match(await r.text(), /Filename path resolves outside config.mocksDir/)

		const r2 = await api.deleteMock('../outside.txt')
		equal(r2.status, 403)
		match(await r2.text(), /Filename path resolves outside config.mocksDir/)
	})

	test('write and delete (with watcher)', async () => {
		await api.setWatchMocks(true)
		const file = 'new-mock.GET.200.txt'

		const nextVerPromise = resolveOnNextSyncVersion()
		const res = await api.writeMock(file, '')
		equal(res.status, 200)
		await nextVerPromise
		const r = await request('/new-mock')
		equal(r.status, 200)

		const nextVerPromise2 = resolveOnNextSyncVersion()
		await api.deleteMock(file)
		await nextVerPromise2
		const r2 = await request('/new-mock')
		equal(r2.status, 404)
	})

	test('write and delete (without watcher)', async () => {
		await api.setWatchMocks(false)
		const file = 'manual-mock.GET.200.txt'

		await api.writeMock(file, '')
		const r = await request('/manual-mock')
		equal(r.status, 200)

		await api.deleteMock(file)
		const r2 = await request('/manual-mock')
		equal(r2.status, 404)
	})

	test('can overwrite', async () => {
		const f = 'overwrite.GET.200.txt'
		await api.writeMock(f, 'write1')
		await api.writeMock(f, 'write2')
		const r = await request('/overwrite')
		equal(await r.text(), 'write2')
		await api.deleteMock(f)
	})
})


describe('import resolvers', () => {
	test('resolves extensionless ts', async () => {
		await api.writeMock('_scores.ts', 'export default [1,2,3]')
		await api.writeMock('user-scores.GET.200.ts',
			// language=typescript
			`
				import scores from './_scores'

				export default scores
			`)
		const r = await request('/user-scores')
		deepEqual(await r.json(), [1, 2, 3])
	})

	test('imports are cache busted', async () => {
		await api.writeMock('_scores.ts', 'export default [4,5,6]')
		const r = await request('/user-scores')
		deepEqual(await r.json(), [4, 5, 6])
		await api.deleteMock('_scores.ts')
		await api.deleteMock('user-scores.GET.200.ts')
	})
})


describe('Watch mocks API toggler', () => {
	test('422 for non boolean', async () => {
		const r = await api.setWatchMocks('not-a-boolean')
		equal(r.status, 422)
		equal(await r.text(), 'Expected boolean for "watchMocks"')
	})

	test('200', async () => {
		equal((await api.setWatchMocks(true)).status, 200)
		equal((await api.setWatchMocks(false)).status, 200)
	})
})


describe('Registering Mocks', () => {
	// simulates user interacting with the file-system directly
	class FixtureExternal extends Fixture {
		async writeExternally() {
			const nextVerPromise = resolveOnNextSyncVersion()
			await sleep(0) // next macro task
			await this.write()
			await nextVerPromise
		}

		async deleteExternally() {
			const nextVerPromise = resolveOnNextSyncVersion()
			await sleep(0)
			await this.delete()
			await nextVerPromise
		}
	}

	function sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms))
	}

	const fxA = new FixtureExternal('register(default).GET.200.json')
	const fxB = new FixtureExternal('register(alt).GET.200.json')

	test('when watcher is off, newly added mocks do not get registered', async () => {
		await api.setWatchMocks(false)
		const fx = new FixtureExternal('non-auto-registered-file.GET.200.json')
		await writeInMocksDir(fx.file, fx.body)
		await sleep(100)
		equal(await fx.fetchBroker(), undefined)
		await rmFromMocksDir(fx.file)
	})

	test('register', async () => {
		await api.setWatchMocks(true)
		await fxA.writeExternally()
		await fxB.writeExternally()
		const b = await fxA.fetchBroker()
		deepEqual(b.mocks, [fxA.file, fxB.file])
	})

	test('unregistering selected ensures a mock is selected', async () => {
		await api.select(fxA.file)
		await fxA.deleteExternally()
		const b = await fxA.fetchBroker()
		deepEqual(b.mocks, [fxB.file])
	})

	test('unregistering the last mock removes broker', async () => {
		await fxB.deleteExternally()
		const b = await fxB.fetchBroker()
		equal(b, undefined)
	})

	test('registering a 500 unsets autoStatus', async () => {
		const fx200 = new FixtureExternal('reg-error.GET.200.txt')
		const fx500 = new FixtureExternal('reg-error.GET.500.txt')
		await fx200.writeExternally()
		await api.toggleStatus(fx200.method, fx200.urlMask, 500)
		const b0 = await fx200.fetchBroker()
		equal(b0.autoStatus, 500)
		await fx500.writeExternally()
		const b1 = await fx200.fetchBroker()
		equal(b1.autoStatus, 0)
		deepEqual(b1.mocks, [
			fx200.file,
			fx500.file
		])
		await fx200.deleteExternally()
		await fx500.deleteExternally()
	})

	describe('getSyncVersion', () => {
		const fx0 = new FixtureExternal('reg0/runtime0.GET.200.txt')
		let version
		before(async () => {
			await makeDirInMocks('reg0')
			await writeInMocksDir(fx0.file, fx0.body)
			version = await resolveOnNextSyncVersion(-1)
		})

		const fx = new FixtureExternal('runtime1.GET.200.txt')
		test('responds when a file is added', async () => {
			const prom = resolveOnNextSyncVersion(version)
			await writeInMocksDir(fx.file, fx.body)
			equal(await prom, version + 1)
		})

		test('responds when a file is deleted', async () => {
			const prom = resolveOnNextSyncVersion(version + 1)
			await rmFromMocksDir(fx.file)
			equal(await prom, version + 2)
		})

		test('responds when dir is renamed', async () => {
			const prom = resolveOnNextSyncVersion(version + 2)
			await renameInMocksDir('reg0', 'reg1')
			equal(await prom, version + 3)

			const s = await fetchState()
			equal(s.brokersByMethod.GET['/reg1/runtime0'].file, 'reg1/runtime0.GET.200.txt')
		})
	})

	test('deleting a folder unregisters mocks in it', async () => {
		const fx = new FixtureExternal('api/bulk-delete/bar.GET.200.json')
		await fx.writeExternally()
		config.watcherDebounceMs = 100 // Because on macOS rmdir triggers a few events
		const nextVerPromise = resolveOnNextSyncVersion()
		await rmDirFromMocks('api/bulk-delete')
		await nextVerPromise
		equal(await fx.fetchBroker(), undefined)
		await sleep(50) // Only for Docker, not sure why we need to delay the server teardown 
	})
})


/** In Node, there's no EventSource, so we work around it like this.
 * This is for listening to real-time updates. It responds when a new mock is added, deleted, or renamed. */
async function resolveOnNextSyncVersion(currSyncVer = undefined) {
	let skipFirst = currSyncVer === undefined
	const response = await api.getSyncVersion()
	const stream = response.body.pipeThrough(new TextDecoderStream())
	let buffer = ''

	for await (const chunk of stream) {
		buffer += chunk
		const parts = buffer.split('\n\n')
		buffer = parts.pop() || ''

		for (const event of parts)
			for (const line of event.split(/\r?\n/))
				if (line.startsWith('data:')) {
					const v = Number(line.slice(5).trim())
					if (skipFirst || v === currSyncVer)
						skipFirst = false
					else
						return v
				}
	}
}

