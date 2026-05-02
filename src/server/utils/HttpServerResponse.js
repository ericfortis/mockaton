import fs from 'node:fs'
import http from 'node:http'
import { pipeline } from 'node:stream/promises'

import { mimeFor } from './mime.js'


export class ServerResponse extends http.ServerResponse {
	setHeaderList(headers) {
		for (let i = 0; i < headers.length; i += 2)
			this.setHeader(headers[i], headers[i + 1])
	}

	ok() {
		this.end()
	}

	html(html, csp) {
		this.setHeader('Content-Type', mimeFor('.html'))
		this.setHeader('Content-Security-Policy', csp)
		this.end(html)
	}

	json(payload) {
		this.setHeader('Content-Type', mimeFor('.json'))
		this.end(JSON.stringify(payload))
	}

	async file(file) {
		this.setHeader('Content-Type', mimeFor(file))
		await pipeline(fs.createReadStream(file), this)
	}

	noContent() {
		this.statusCode = 204
		this.end()
	}


	badRequest() {
		this.statusCode = 400
		this.end()
	}

	forbidden(msg) {
		this.statusCode = 403
		this.end(msg)
	}

	notFound() {
		this.statusCode = 404
		this.end()
	}

	uriTooLong() {
		this.statusCode = 414
		this.end()
	}

	unprocessable(error) {
		this.statusCode = 422
		this.end(error)
	}


	internalServerError() {
		this.statusCode = 500
		this.end()
	}

	badGateway() {
		this.statusCode = 502
		this.end()
	}


	async partialContent(file) {
		const { size } = await fs.promises.lstat(file)
		let [start, end] = this.req.headers.range.replace(/bytes=/, '').split('-').map(n => parseInt(n, 10))

		if (isNaN(start)) {
			start = size - end
			end = size - 1
		}
		else if (isNaN(end))
			end = size - 1

		if (start < 0 || end >= size || start > end) {
			this.statusCode = 416 // Range Not Satisfiable
			this.setHeader('Content-Range', `bytes */${size}`)
			this.end()
			return
		}

		this.statusCode = 206 // Partial Content
		this.setHeader('Accept-Ranges', 'bytes')
		this.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
		this.setHeader('Content-Length', (end - start) + 1)
		this.setHeader('Content-Type', mimeFor(file))

		const stream = fs.createReadStream(file, { start, end })
		this.on('close', () => stream.destroy())
		stream.pipe(this)
	}
}
