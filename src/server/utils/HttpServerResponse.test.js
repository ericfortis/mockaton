import { describe, test, before, after } from 'node:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { equal } from 'node:assert/strict'
import { join } from 'node:path'
import { rm } from 'node:fs/promises'

import { ServerResponse } from './HttpServerResponse.js'

describe('ServerResponse', () => {
	const FILE = '0123456789'

	let tmpDir, tmpFile, server, addr
	before(async () => {
		tmpDir = mkdtempSync(join(tmpdir(), 'response-'))
		tmpFile = join(tmpDir, 'test.txt')
		writeFileSync(tmpFile, FILE)

		server = createServer({ ServerResponse }, (req, response) => {
			const file = join(tmpDir, req.url)
			if (req.headers.range)
				response.partialContent(file)
			else
				response.file(file)
		})

		await new Promise(resolve => server.listen(0, () => {
			addr = `http://127.0.0.1:${(server.address().port)}`
			resolve()
		}))
	})

	after(async () => {
		server?.close()
		await rm(tmpDir, { recursive: true, force: true })
	})


	describe('partialContent', () => {
		const GET = (path, range) => fetch(addr + path, { headers: { range } })

		test('404', async () => {
			const r = await GET('/not-found', 'bytes=0-')
			equal(r.status, 404)
			equal(r.headers.get('content-length'), '0')
		})

		test('416 - out of bounds', async () => {
			for (const range of ['bytes=10-12', 'bytes=5-2', 'bytes=12-', 'bytes=-15']) {
				const r = await GET('/test.txt', range)
				equal(r.status, 416)
				equal(r.headers.get('content-range'), `bytes */${FILE.length}`)
			}
		})

		test('206 - normal range', async () => {
			const r = await GET('/test.txt', 'bytes=0-4')
			equal(r.status, 206)
			equal(r.headers.get('content-range'), `bytes 0-4/${FILE.length}`)
			equal(r.headers.get('content-length'), '5')
			equal(r.headers.get('content-type'), 'text/plain')
			equal(await r.text(), '01234')
		})

		test('206 - suffix range', async () => {
			const r = await GET('/test.txt', 'bytes=-3')
			equal(r.status, 206)
			equal(r.headers.get('content-range'), `bytes 7-9/${FILE.length}`)
			equal(r.headers.get('content-length'), '3')
			equal(await r.text(), '789')
		})

		test('206 - open ended range', async () => {
			const r = await GET('/test.txt', 'bytes=5-')
			equal(r.status, 206)
			equal(r.headers.get('content-range'), `bytes 5-9/${FILE.length}`)
			equal(r.headers.get('content-length'), '5')
			equal(await r.text(), '56789')
		})
	})


	describe('file', () => {
		const GET = path => fetch(addr + path)

		test('404', async () => {
			const r = await GET('/not-found')
			equal(r.status, 404)
			equal(r.headers.get('content-length'), '0')
		})

		test('200', async () => {
			const r = await GET('/test.txt')
			equal(r.status, 200)
			equal(r.headers.get('content-type'), 'text/plain')
			equal(r.headers.get('content-length'), String(FILE.length))
			equal(await r.text(), FILE)
		})
	})
})
