import { tmpdir } from 'node:os'
import { dirname } from 'node:path'
import { promisify } from 'node:util'
import { describe, it } from 'node:test'
import { createServer } from 'node:http'
import { equal, deepEqual, match } from 'node:assert/strict'
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs'

import { Config } from './Config.js'
import { mimeFor } from './utils/mime.js'
import { Mockaton } from './Mockaton.js'
import { Commander } from './Commander.js'
import { parseFilename } from './Filename.js'
import { CorsHeader } from './utils/http-cors.js'
import { API, DEFAULT_500_COMMENT, DEFAULT_MOCK_COMMENT } from './ApiConstants.js'


const tmpDir = mkdtempSync(tmpdir()) + '/'
const staticTmpDir = mkdtempSync(tmpdir()) + '/'
console.log(tmpDir)

const fixtureCustomMime = [
	'/api/custom-mime',
	'api/custom-mime.GET.200.my_custom_extension',
	'Custom Extension and MIME'
]

const fixtureNonDefaultInName = [
	'/api/the-route',
	'api/the-route(default).GET.200.json',
	'default my route body content'
]
const fixtureDefaultInName = [
	'/api/the-route',
	'api/the-route(default).GET.200.json',
	'default my route body content'
]

const fixtureDelayed = [
	'/api/delayed',
	'api/delayed.GET.200.json',
	'Route_To_Be_Delayed'
]

const fixtures = [
	[
		'/api',
		'api/.GET.200.json',
		'index-like route for /api, which could just be the extension convention'
	],

	// Exact route paths
	fixtureDefaultInName,
	fixtureDelayed,
	[
		'/api/the-route',
		'api/the-route(default).GET.200.json',
		'default my route body content'
	],
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
	fixtureCustomMime
]
for (const [, file, body] of [fixtureNonDefaultInName, ...fixtures])
	write(file, file.endsWith('.json') ? JSON.stringify(body) : body)

write('api/.GET.500.txt', 'keeps non-autogenerated 500')
write('api/alternative(comment-2).GET.200.json', JSON.stringify({ comment: 2 }))
write('api/my-route(comment-2).GET.200.json', JSON.stringify({ comment: 2 }))
write('api/ignored.GET.200.json~', '')

// JavaScript to JSON
write('/api/object.GET.200.js', 'export default { JSON_FROM_JS: true }')

writeStatic('index.html', '<h1>Static</h1>')
writeStatic('assets/app.js', 'const app = 1')
writeStatic('another-entry/index.html', '<h1>Another</h1>')



const server = Mockaton({
	mocksDir: tmpDir,
	staticDir: staticTmpDir,
	delay: 40,
	onReady: () => {},
	cookies: {
		userA: 'CookieA',
		userB: 'CookieB'
	},
	extraHeaders: ['Server', 'MockatonTester'],
	extraMimes: {
		my_custom_extension: 'my_custom_mime'
	},
	corsOrigins: ['http://example.com']
})
server.on('listening', runTests)

function mockatonAddr() {
	const { address, port } = server.address()
	return `http://${address}:${port}`
}

function request(path, options = {}) {
	return fetch(`${mockatonAddr()}${path}`, options)
}

let commander
async function runTests() {
	commander = new Commander(mockatonAddr())

	await testItRendersDashboard()
	await test404()

	for (const [url, file, body] of fixtures)
		await testMockDispatching(url, file, body)

	await testDefaultMock()

	await testItUpdatesRouteDelay(...fixtureDelayed)
	await testBadRequestWhenUpdatingNonExistingMockAlternative()

	await testAutogenerates500(
		'/api/alternative',
		`api/alternative${DEFAULT_500_COMMENT}.GET.500.txt`)

	await testPreservesExiting500(
		'/api',
		'api/.GET.500.txt',
		'keeps non-autogenerated 500')

	await commander.reset()
	await testItUpdatesTheCurrentSelectedMock(
		'/api/alternative',
		'api/alternative(comment-2).GET.200.json',
		200,
		JSON.stringify({ comment: 2 }))

	await commander.reset()
	await testExtractsAllComments([
		'(comment-1)',
		'(comment-2)',
		DEFAULT_500_COMMENT,
		'(this is the actual comment)',
		'(another comment)',
		DEFAULT_MOCK_COMMENT
	])
	await testItBulkSelectsByComment('(comment-2)', [
		['/api/alternative', 'api/alternative(comment-2).GET.200.json', { comment: 2 }],
		['/api/my-route', 'api/my-route(comment-2).GET.200.json', { comment: 2 }]
	])

	await commander.reset()
	for (const [url, file, body] of fixtures)
		await testMockDispatching(url, file, body)

	await testMockDispatching('/api/object', 'api/object.GET.200.js', { JSON_FROM_JS: true }, mimeFor('.json'))
	await testMockDispatching(...fixtureCustomMime, 'my_custom_mime')
	await testJsFunctionMocks()

	await testItUpdatesUserRole()
	await testStaticFileServing()
	await testInvalidFilenamesAreIgnored()
	await testEnableFallbackSoRoutesWithoutMocksGetRelayed()
	await testCorsAllowed()

	server.close()
}


async function testItRendersDashboard() {
	const res = await request(API.dashboard)
	const body = await res.text()
	await describe('Dashboard', () =>
		it('Renders HTML', () => match(body, new RegExp('<!DOCTYPE html>'))))
}

async function test404() {
	await it('Sends 404 when there is no mock', async () => {
		const res = await request('/api/non-existing')
		equal(res.status, 404)
	})
	await it('Sends 404 when there’s no mock at all for a method', async () => {
		const res = await request('/api/non-existing-too', { method: 'DELETE' })
		equal(res.status, 404)
	})
	await it('Ignores files ending in ~ by default, e.g. JetBrains temp files', async () => {
		const res = await request('/api/ignored')
		equal(res.status, 404)
	})
}

async function testMockDispatching(url, file, expectedBody, forcedMime = undefined) {
	const { urlMask, method, status } = parseFilename(file)
	const mime = forcedMime || mimeFor(file)
	const res = await request(url, { method })
	const body = mime === 'application/json'
		? await res.json()
		: await res.text()
	await describe('URL Mask: ' + urlMask, () => {
		it('file: ' + file, () => deepEqual(body, expectedBody))
		it('mime: ' + mime, () => equal(res.headers.get('content-type'), mime))
		it('status: ' + status, () => equal(res.status, status))
		it('cookie: ' + mime, () => equal(res.headers.get('set-cookie'), 'CookieA'))
		it('extra header', () => equal(res.headers.get('server'), 'MockatonTester'))
	})
}

async function testDefaultMock() {
	await testMockDispatching(...fixtureDefaultInName)
}

async function testItUpdatesTheCurrentSelectedMock(url, file, expectedStatus, expectedBody) {
	await commander.select(file)
	const res = await request(url)
	const body = await res.text()
	await describe('url: ' + url, () => {
		it('body is: ' + expectedBody, () => equal(body, expectedBody))
		it('status is: ' + expectedStatus, () => equal(res.status, expectedStatus))
	})
}

async function testItUpdatesRouteDelay(url, file, expectedBody) {
	const { method } = parseFilename(file)
	await commander.setRouteIsDelayed(method, url, true)
	const now = new Date()
	const res = await request(url)
	const body = await res.text()
	await describe('url: ' + url, () => {
		it('body is: ' + expectedBody, () => equal(body, JSON.stringify(expectedBody)))
		it('delay', () => equal((new Date()).getTime() - now.getTime() > Config.delay, true))
	})
}

async function testBadRequestWhenUpdatingNonExistingMockAlternative() {
	await it('There are mocks for /api/the-route but not this one', async () => {
		const missingFile = 'api/the-route(non-existing-variant).GET.200.json'
		const res = await commander.select(missingFile)
		equal(res.status, 400)
		equal(await res.text(), `Missing Mock: ${missingFile}`)
	})
}

async function testAutogenerates500(url, file) {
	await commander.select(file)
	const res = await request(url)
	const body = await res.text()
	await describe('autogenerated in-memory 500', () => {
		it('body is empty', () => equal(body, ''))
		it('status is: 500', () => equal(res.status, 500))
	})
}

async function testPreservesExiting500(url, file, expectedBody) {
	await commander.select(file)
	const res = await request(url)
	const body = await res.text()
	await describe('preserves existing 500', () => {
		it('body is empty', () => equal(body, expectedBody))
		it('status is: 500', () => equal(res.status, 500))
	})
}

async function testExtractsAllComments(expected) {
	const res = await commander.listComments()
	const body = await res.json()
	await it('Extracts all comments without duplicates', () =>
		deepEqual(body, expected))
}

async function testItBulkSelectsByComment(comment, tests) {
	await commander.bulkSelectByComment(comment)
	for (const [url, file, body] of tests)
		await testMockDispatching(url, file, body)
}


async function testItUpdatesUserRole() {
	await describe('Cookie', () => {
		it('Defaults to the first key:value', async () => {
			const res = await commander.listCookies()
			deepEqual(await res.json(), [
				['userA', true],
				['userB', false]
			])
		})

		it('Update the selected cookie', async () => {
			await commander.selectCookie('userB')
			const res = await commander.listCookies()
			deepEqual(await res.json(), [
				['userA', false],
				['userB', true]
			])
		})
	})
}

async function testJsFunctionMocks() {
	await describe('JS Function Mocks', async () => {
		write('api/js-func.POST.200.js', `
export default function (req, response) {
  response.setHeader('content-type', 'custom-mime')
  return 'SOME_STRING'
}`)
		await commander.reset() // for registering the file
		await testMockDispatching('/api/js-func',
			'api/js-func.POST.200.js',
			'SOME_STRING',
			'custom-mime')
	})
}


async function testStaticFileServing() {
	await describe('Static File Serving', () => {
		it('Defaults to index.html', async () => {
			const res = await request('/')
			const body = await res.text()
			equal(body, '<h1>Static</h1>')
			equal(res.status, 200)
		})

		it('Defaults to in subdirs index.html', async () => {
			const res = await request('/another-entry')
			const body = await res.text()
			equal(body, '<h1>Another</h1>')
			equal(res.status, 200)
		})

		it('Serves exacts paths', async () => {
			const res = await request('/assets/app.js')
			const body = await res.text()
			equal(body, 'const app = 1')
			equal(res.status, 200)
		})
	})
}

async function testInvalidFilenamesAreIgnored() {
	await it('Invalid filenames get skipped, so they don’t crash the server', async (t) => {
		const consoleErrorSpy = t.mock.method(console, 'error')
		consoleErrorSpy.mock.mockImplementation(() => {}) // so they don’t render in the test report

		write('api/_INVALID_FILENAME_CONVENTION_.json', '')
		write('api/bad-filename-method._INVALID_METHOD_.200.json', '')
		write('api/bad-filename-status.GET._INVALID_STATUS_.json', '')
		await commander.reset()
		equal(consoleErrorSpy.mock.calls[0].arguments[0], 'Invalid Filename Convention')
		equal(consoleErrorSpy.mock.calls[1].arguments[0], 'Unrecognized HTTP Method: "_INVALID_METHOD_"')
		equal(consoleErrorSpy.mock.calls[2].arguments[0], 'Invalid HTTP Response Status: "NaN"')
	})
}

async function testEnableFallbackSoRoutesWithoutMocksGetRelayed() {
	await describe('Fallback', async () => {
		const fallbackServer = createServer((_, response) => {
			response.setHeader('custom_header', 'my_custom_header')
			response.statusCode = 423
			response.end('From_Fallback_Server')
		})
		await promisify(fallbackServer.listen).bind(fallbackServer, 0, '127.0.0.1')()

		await commander.setProxyFallback(`http://localhost:${fallbackServer.address().port}`)
		await it('Relays to fallback server', async () => {
			const res = await request('/non-existing-mock')
			equal(res.headers.get('custom_header'), 'my_custom_header')
			equal(res.status, 423)
			equal(await res.text(), 'From_Fallback_Server')
			fallbackServer.close()
		})
	})
}

async function testCorsAllowed() {
	await it('cors', async () => {
		await commander.setCorsAllowed(true)
		const res = await request('/does-not-matter', {
			method: 'OPTIONS',
			headers: {
				[CorsHeader.Origin]: 'http://example.com',
				[CorsHeader.AccessControlRequestMethod]: 'GET'
			}
		})
		equal(res.status, 204)
		equal(res.headers.get(CorsHeader.AccessControlAllowOrigin), 'http://example.com')
		equal(res.headers.get(CorsHeader.AccessControlAllowMethods), 'GET')
	})
}


// Utils

function write(filename, data) {
	_write(tmpDir + filename, data)
}

function writeStatic(filename, data) {
	_write(staticTmpDir + filename, data)
}

function _write(absPath, data) {
	mkdirSync(dirname(absPath), { recursive: true })
	writeFileSync(absPath, data, 'utf8')
}

