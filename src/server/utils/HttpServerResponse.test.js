import { describe, test, before, after } from 'node:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import http, { createServer } from 'node:http'
import { join, dirname } from 'node:path'
import { strictEqual } from 'node:assert'
import { tmpdir } from 'node:os'
import { rm } from 'node:fs/promises'

import { ServerResponse } from './HttpServerResponse.js'

describe('ServerResponse.partialContent (real HTTP)', () => {
	const FILE = '0123456789'
	const FILE_SIZE = FILE.length

	let tmpFile, server, baseUrl

	before(async () => {
		const tmpDir = mkdtempSync(join(tmpdir(), 'response-'))
		tmpFile = join(tmpDir, 'test.txt')
		writeFileSync(tmpFile, FILE)
		server = createServer({ ServerResponse }, async (_, response) => {
			await response.partialContent(tmpFile)
		})
		await new Promise(resolve => server.listen(0, () => {
			const { port } = server.address()
			baseUrl = `http://127.0.0.1:${port}`
			resolve()
		}))
	})

	after(async () => {
		server?.close()
		await rm(dirname(tmpFile), { recursive: true, force: true })
	})

	function request(range) {
		return new Promise((resolve, reject) => {
			const req = http.get(baseUrl, { headers: { range } }, response => {
				let data = ''
				response.setEncoding('utf8')
				response.on('data', chunk => data += chunk)
				response.on('end', () => resolve({
					statusCode: response.statusCode,
					headers: response.headers,
					data
				}))
			})
			req.on('error', reject)
		})
	}

	test('416 - out of bounds', async () => {
		for (const range of ['bytes=10-12', 'bytes=5-2', 'bytes=12-', 'bytes=-15']) {
			const { statusCode, headers } = await request(range)
			strictEqual(statusCode, 416)
			strictEqual(headers['content-range'], `bytes */${FILE_SIZE}`)
		}
	})

	test('206 - normal range', async () => {
		const { statusCode, headers, data } = await request('bytes=0-4')
		strictEqual(statusCode, 206)
		strictEqual(headers['content-range'], `bytes 0-4/${FILE_SIZE}`)
		strictEqual(headers['content-length'], '5')
		strictEqual(headers['content-type'], 'text/plain')
		strictEqual(data, '01234')
	})

	test('206 - suffix range', async () => {
		const { statusCode, headers, data } = await request('bytes=-3')
		strictEqual(statusCode, 206)
		strictEqual(headers['content-range'], `bytes 7-9/${FILE_SIZE}`)
		strictEqual(headers['content-length'], '3')
		strictEqual(data, '789')
	})

	test('206 - open ended range', async () => {
		const { statusCode, headers, data } = await request('bytes=5-')
		strictEqual(statusCode, 206)
		strictEqual(headers['content-range'], `bytes 5-9/${FILE_SIZE}`)
		strictEqual(headers['content-length'], '5')
		strictEqual(data, '56789')
	})
})
