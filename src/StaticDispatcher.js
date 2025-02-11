import { join, isAbsolute } from 'node:path'
import fs, { readFileSync } from 'node:fs'

import { config } from './config.js'
import { mimeFor } from './utils/mime.js'
import { isDirectory, isFile } from './utils/fs.js'
import { sendNotFound, sendInternalServerError } from './utils/http-response.js'


export function isStatic(req) {
	if (!config.staticDir)
		return false
	if (!isAbsolute(req.url)) // prevent sandbox escape
		return false
	const f = resolvePath(req.url)
	return !config.ignore.test(f) && Boolean(f)
}

export async function dispatchStatic(req, response) {
	const file = resolvePath(req.url)
	if (!file)
		sendNotFound(response)
	else if (req.headers.range)
		await sendPartialContent(response, req.headers.range, file)
	else
		sendFile(response, file)
}

function resolvePath(url) {
	let candidate = join(config.staticDir, url)
	if (isDirectory(candidate))
		candidate += '/index.html'
	if (isFile(candidate))
		return candidate
}

function sendFile(response, file) {
	if (!isFile(file))
		sendNotFound(response)
	else {
		response.setHeader('Content-Type', mimeFor(file))
		response.end(readFileSync(file, 'utf8'))
	}
}

async function sendPartialContent(response, range, file) {
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




