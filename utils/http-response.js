import fs, { readFileSync } from 'node:fs'
import { mimeFor } from './mime.js'


export function sendOK(response) {
	response.end()
}

export function sendJSON(response, payload) {
	response.setHeader('content-type', 'application/json')
	response.end(JSON.stringify(payload))
}

export function sendFile(response, file) {
	response.setHeader('content-type', mimeFor(file))
	response.end(readFileSync(file))
}

export async function sendPartialContent(response, range, file) {
	const { size } = await fs.promises.lstat(file)
	let [start, end] = range.replace(/bytes=/, '').split('-').map(n => parseInt(n, 10))
	if (isNaN(end)) end = size - 1
	if (isNaN(start)) start = size - end

	if (start < 0 || start > end || start >= size || end >= size) {
		response.statusCode = 416 // Range Not Satisfiable
		response.setHeader('content-range', `bytes */${size}`)
		response.end()
	}
	else {
		response.statusCode = 206 // Partial Content
		response.setHeader('accept-ranges', 'bytes')
		response.setHeader('content-range', `bytes ${start}-${end}/${size}`)
		response.setHeader('content-type', mimeFor(file))
		const reader = fs.createReadStream(file, { start, end })
		reader.on('open', function () {
			this.pipe(response)
		})
		reader.on('error', function (error) {
			console.error(error)
			sendInternalServerError(response)
		})
	}
}


export function sendBadRequest(response) {
	response.statusCode = 400
	response.end()
}

export function sendNotFound(response) {
	response.statusCode = 404
	response.end()
}

export function sendInternalServerError(response) {
	response.statusCode = 500
	response.end()
}
