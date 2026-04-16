import http from 'node:http'
import fs, { readFileSync } from 'node:fs'

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

	file(file) {
		this.setHeader('Content-Type', mimeFor(file))
		this.end(readFileSync(file, 'utf8'))
	}

	noContent() {
		this.statusCode = 204
		this.end()
	}


	badRequest() {
		this.statusCode = 400
		this.end()
	}

	forbidden() {
		this.statusCode = 403
		this.end()
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


	async partialContent(range, file) {
		const { size } = await fs.promises.lstat(file)
		let [start, end] = range.replace(/bytes=/, '').split('-').map(n => parseInt(n, 10))
		if (isNaN(end)) end = size - 1
		if (isNaN(start)) start = size - end

		if (start < 0 || start > end || start >= size || end >= size) {
			this.statusCode = 416 // Range Not Satisfiable
			this.setHeader('Content-Range', `bytes */${size}`)
			this.end()
			return
		}

		this.statusCode = 206 // Partial Content
		this.setHeader('Accept-Ranges', 'bytes')
		this.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
		this.setHeader('Content-Type', mimeFor(file))

		return new Promise((resolve, reject) => {
			const reader = fs.createReadStream(file, { start, end })
			this.on('error', reject)
			reader.on('error', reject)
			reader.on('end', resolve)
			reader.pipe(this)
		})
	}
}
