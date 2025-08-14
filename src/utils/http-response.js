import fs, { readFileSync } from 'node:fs'
import { mimeFor } from './mime.js'
import { HEADER_FOR_502 } from '../ApiConstants.js'


export function sendOK(response) {
	response.end()
}

export function sendNoContent(response) {
	response.statusCode = 204
	response.end()
}

export function sendJSON(response, payload) {
	response.setHeader('Content-Type', 'application/json')
	response.end(JSON.stringify(payload))
}

export function sendFile(response, file) {
	response.setHeader('Content-Type', mimeFor(file))
	response.end(readFileSync(file, 'utf8'))
}

export function sendNotFound(response) {
	response.statusCode = 404
	response.end()
}

export function sendUnprocessableContent(response, error) {
	console.error(error)
	response.statusCode = 422
	response.end(error)
}

export function sendInternalServerError(response, error) {
	console.error(error)
	response.statusCode = 500
	response.end()
}

export function sendBadGateway(response, error) {
	console.error('Fallback Proxy Error:', error.cause.message)
	response.statusCode = 502
	response.setHeader(HEADER_FOR_502, 1)
	response.end()
}


export async function sendPartialContent(response, range, file) {
	const { size } = await fs.promises.lstat(file)
	let [start, end] = range.replace(/bytes=/, '').split('-').map(n => parseInt(n, 10))
	if (isNaN(end)) end = size - 1
	if (isNaN(start)) start = size - end

	if (start < 0 || start > end || start >= size || end >= size) {
		response.statusCode = 416 // Range Not Satisfiable
		response.setHeader('Content-Range', `bytes */${size}`)
		response.end()
	}
	else {
		response.statusCode = 206 // Partial Content
		response.setHeader('Accept-Ranges', 'bytes')
		response.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
		response.setHeader('Content-Type', mimeFor(file))
		const reader = fs.createReadStream(file, { start, end })
		reader.on('open', function () {
			this.pipe(response)
		})
		reader.on('error', function (error) {
			sendInternalServerError(response, error)
		})
	}
}
