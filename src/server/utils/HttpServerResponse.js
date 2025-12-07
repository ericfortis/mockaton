import http from 'node:http'
import fs, { readFileSync } from 'node:fs'

import { logger } from './logger.js'
import { mimeFor } from './mime.js'
import { HEADER_502 } from '../ApiConstants.js'


export class ServerResponse extends http.ServerResponse {
	setHeaderList(headers) {
		for (let i = 0; i < headers.length; i += 2)
			this.setHeader(headers[i], headers[i + 1])
	}

	sendOK() {
		logger.access(this)
		this.end()
	}

	sendHTML(html, csp) {
		logger.access(this)
		this.setHeader('Content-Type', mimeFor('html'))
		this.setHeader('Content-Security-Policy', csp)
		this.end(html)
	}

	sendJSON(payload) {
		logger.access(this)
		this.setHeader('Content-Type', 'application/json')
		this.end(JSON.stringify(payload))
	}

	sendFile(file) {
		logger.access(this)
		this.setHeader('Content-Type', mimeFor(file))
		this.end(readFileSync(file, 'utf8'))
	}

	sendNoContent() {
		this.statusCode = 204
		logger.access(this)
		this.end()
	}


	sendBadRequest() {
		this.statusCode = 400
		logger.access(this)
		this.end()
	}

	sendNotFound() {
		this.statusCode = 404
		logger.access(this)
		this.end()
	}

	sendMockNotFound() {
		this.statusCode = 404
		logger.accessMock(this.req.url, '404')
		this.end()
	}

	sendTooLongURI() {
		this.statusCode = 414
		logger.access(this)
		this.end()
	}

	sendUnprocessable(error) {
		logger.access(this, error)
		this.statusCode = 422
		this.end(error)
	}


	sendInternalServerError(error) {
		logger.error(500, this.req.url, error?.message || error, error?.stack || '')
		this.statusCode = 500
		this.end()
	}

	sendBadGateway(error) {
		logger.warn('Fallback Proxy Error:', error.cause.message)
		this.statusCode = 502
		this.setHeader(HEADER_502, 1)
		this.end()
	}


	async sendPartialContent(range, file) {
		const { size } = await fs.promises.lstat(file)
		let [start, end] = range.replace(/bytes=/, '').split('-').map(n => parseInt(n, 10))
		if (isNaN(end)) end = size - 1
		if (isNaN(start)) start = size - end

		if (start < 0 || start > end || start >= size || end >= size) {
			this.statusCode = 416 // Range Not Satisfiable
			this.setHeader('Content-Range', `bytes */${size}`)
			this.end()
		}
		else {
			this.statusCode = 206 // Partial Content
			this.setHeader('Accept-Ranges', 'bytes')
			this.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
			this.setHeader('Content-Type', mimeFor(file))
			const reader = fs.createReadStream(file, { start, end })
			const response = this
			reader.on('open', function () {
				this.pipe(response)
			})
			reader.on('error', error => {
				this.sendInternalServerError(error)
			})
		}
	}
}
