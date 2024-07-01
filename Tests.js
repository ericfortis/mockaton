#!/usr/bin/env node

import { tmpdir } from 'node:os'
import { dirname } from 'node:path'
import { describe, it } from 'node:test'
import { equal, deepEqual, match } from 'node:assert/strict'
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs'

import { Route } from './Route.js'
import { mimeFor } from './utils/mime.js'
import { DP, DF } from './ApiConstants.js'
import { Mockaton } from './Mockaton.js'


const tmpDir = mkdtempSync(tmpdir()) + '/'
const staticTmpDir = mkdtempSync(tmpdir()) + '/'
const fixtures = [
	[
		'/api',
		'api/.GET.200.json',
		'index-like route is just the extension convention'
	],

	// Exact route paths
	[
		'/api/the-route',
		'api/the-route(comment-1).GET.200.json',
		'my route body content'
	], [
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
	]
]
for (const [, file, body] of fixtures)
	write(file, file.endsWith('.json') ? JSON.stringify(body) : body)

write('api/.GET.501.txt', 'keeps non-autogenerated 501')
write('api/alternative(comment-2).GET.200.json', JSON.stringify({ comment: 2 }))
write('api/my-route(comment-2).GET.200.json', JSON.stringify({ comment: 2 }))

// These files ensure the server doesn’t crash. We don’t test their console.error 
write('api/bad-filename.200.json', 'missing method')
write('api/bad-filename.GET.200', 'missing extension')
write('api/bad-filename.GET.json', 'missing response status')

writeStatic('index.html', '<h1>Static</h1>')
writeStatic('assets/app.js', 'const app = 1')
writeStatic('another-entry/index.html', '<h1>Another</h1>')


const server = Mockaton({
	mocksDir: tmpDir,
	staticDir: staticTmpDir,
	skipOpen: true,
	cookies: {
		userA: 'CookieA',
		userB: 'CookieB'
	}
})
server.on('listening', runTests)

async function runTests() {
	await testItRendersDashboard()

	for (const [url, file, body] of fixtures)
		await testMockDispatching(url, file, body)

	await testItUpdatesDelayAndFile(
		'/api/alternative',
		'api/alternative(comment-1).GET.200.json')

	await testAutogenerates501(
		'/api/company-e/123?limit=9',
		'api/company-e/[id]?limit=[limit].GET.501.txt')

	await testPreservesExiting501(
		'/api',
		'api/.GET.501.txt',
		'keeps non-autogenerated 501')

	await reset()
	await testItUpdatesTheCurrentSelectedMock(
		'/api/alternative',
		'api/alternative(comment-2).GET.200.json',
		200,
		JSON.stringify({ comment: 2 }))

	await reset()
	await testExtractsAllComments([
		'(comment-1)',
		'(comment-2)',
		'(this is the actual comment)',
		'(another comment)'
	])
	await testItBulkSelectsByComment('(comment-2)',
		[
			['/api/alternative', 'api/alternative(comment-2).GET.200.json', { comment: 2 }],
			['/api/my-route', 'api/my-route(comment-2).GET.200.json', { comment: 2 }]
		]
	)

	await reset()
	for (const [url, file, body] of fixtures)
		await testMockDispatching(url, file, body)

	await testItUpdatesUserRole()
	await testTransforms()

	await testStaticFileServing()

	server.close()
}

async function reset() {
	await request(DP.reset, { method: 'PATCH' })
}

async function testItRendersDashboard() {
	const res = await request(DP.dashboard)
	const body = await res.text()
	await describe('Dashboard', () =>
		it('Renders HTML', () => match(body, new RegExp('<!DOCTYPE html>'))))
}

async function testMockDispatching(url, file, expectedBody, reqBody = void 0) {
	const { urlMask, method, status } = Route.parseFilename(file)
	const mime = mimeFor(file)
	const now = new Date()
	const res = await request(url, { method, body: reqBody })
	const body = mime === 'application/json'
		? await res.json()
		: await res.text()
	await describe('URL Mask: ' + urlMask, () => {
		it('file: ' + file, () => deepEqual(body, expectedBody))
		it('mime: ' + mime, () => equal(res.headers.get('content-type'), mime))
		it('status: ' + status, () => equal(res.status, status))
		it('cookie: ' + mime, () => equal(res.headers.get('set-cookie'), 'CookieA'))
		it('delay is under 1 sec', () => equal((new Date()).getTime() - now.getTime() < 1000, true))
	})
}

async function testItUpdatesTheCurrentSelectedMock(url, file, expectedStatus, expectedBody) {
	await request(DP.edit, {
		method: 'PATCH',
		body: JSON.stringify({ [DF.file]: file })
	})
	const res = await request(url)
	const body = await res.text()
	await describe('url: ' + url, () => {
		it('body is: ' + expectedBody, () => equal(body, expectedBody))
		it('status is: ' + expectedStatus, () => equal(res.status, expectedStatus))
	})
}

async function testItUpdatesDelayAndFile(url, file) {
	await request(DP.edit, {
		method: 'PATCH',
		body: JSON.stringify({
			[DF.file]: file,
			[DF.delayed]: true
		})
	})
	const now = new Date()
	await request(url)
	await describe('url: ' + url, () =>
		it('delay is over 1 sec', () => equal((new Date()).getTime() - now.getTime() > 1000, true)))
}


async function testAutogenerates501(url, file) {
	await request(DP.edit, {
		method: 'PATCH',
		body: JSON.stringify({ [DF.file]: file })
	})
	const res = await request(url)
	const body = await res.text()
	await describe('autogenerated 501', () => {
		it('body is empty', () => equal(body, ''))
		it('status is: 501', () => equal(res.status, 501))
	})
}

async function testPreservesExiting501(url, file, expectedBody) {
	await request(DP.edit, {
		method: 'PATCH',
		body: JSON.stringify({ [DF.file]: file })
	})
	const res = await request(url)
	const body = await res.text()
	await describe('preserves existing 501', () => {
		it('body is empty', () => equal(body, expectedBody))
		it('status is: 501', () => equal(res.status, 501))
	})
}

async function testExtractsAllComments(expected) {
	const res = await request(DP.comments)
	const body = await res.json()
	await it('Extracts all comments without duplicates', () =>
		deepEqual(body, expected))
}

async function testItBulkSelectsByComment(comment, tests) {
	await request(DP.bulkSelect, {
		method: 'PATCH',
		body: JSON.stringify({
			[DF.comment]: comment
		})
	})
	for (const [url, file, body] of tests)
		await testMockDispatching(url, file, body)
}


async function testItUpdatesUserRole() {
	await describe('Cookie', () => {
		it('Defaults to the first key:value', async () => {
			const res = await request(DP.cookies)
			deepEqual(await res.json(), [
				['userA', true],
				['userB', false]
			])
		})

		it('Update the selected cookie', async () => {
			await request(DP.cookies, {
				method: 'PATCH',
				body: JSON.stringify({ [DF.currentCookieKey]: 'userB' })
			})
			const res = await request(DP.cookies)
			deepEqual(await res.json(), [
				['userA', false],
				['userB', true]
			])
		})
	})
}

async function testTransforms() {
	await describe('Applies transform', async () => {
		write('api/transform.POST.200.json', JSON.stringify(['initial']))
		write('api/transform.POST.200.mjs', `
export default function (mock, reqBody, config) {
  const body = JSON.parse(mock);
  body.push(reqBody[0]);
  body.push(config.mocksDir);
  return JSON.stringify(body);
}`)
		await reset() // for registering the files
		await request(DP.transform, {
			method: 'PATCH',
			body: JSON.stringify({
				[DF.method]: 'POST',
				[DF.urlMask]: '/api/transform',
				[DF.file]: 'api/transform.POST.200.mjs'
			})
		})
		await testMockDispatching('/api/transform',
			'api/transform.POST.200.json',
			['initial', 'another', tmpDir],
			JSON.stringify(['another']))
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

function request(path, options = {}) {
	const { address, port } = server.address()
	return fetch(`http://${address}:${port}${path}`, options)
}

