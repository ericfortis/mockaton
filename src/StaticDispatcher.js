import { join, basename } from 'node:path'
import { readFileSync } from 'node:fs'

import { mimeFor } from './utils/mime.js'
import { config, isFileAllowed, calcDelay } from './config.js'
import { sendPartialContent, sendNotFound } from './utils/http-response.js'
import { isDirectory, isFile, listFilesRecursively } from './utils/fs.js'


class StaticBroker {
	constructor(file) {
		this.file = file
		this.delayed = false
		this.should404 = false
		this.resolvedPath = this.#staticFilePath()
	}

	#staticFilePath() { // url is absolute e.g. /home/../.. => /
		let candidate = join(config.staticDir, this.file)
		if (isDirectory(candidate))
			candidate = join(candidate, 'index.html')
		if (isFile(candidate))
			return candidate
	}

	updateDelayed(value) {
		this.delayed = value
	}

	updateNotFound(value) {
		this.should404 = value
	}
}

let collection = {}

export function initStaticCollection() {
	collection = {}
	listFilesRecursively(config.staticDir)
		.sort()
		.forEach(registerStaticMock)
}

/** @returns {boolean} registered */
export function registerStaticMock(file) {
	if (!isFileAllowed(basename(file)))
		return false

	file = '/' + file
	if (findStaticBrokerByRoute(file))
		return false

	collection[file] = new StaticBroker(file)
	return true
}

export function unregisterStaticMock(file) {
	delete collection['/' + file]
}

export function findStaticBrokerByRoute(route) {
	return collection[route] || collection[join(route, 'index.html')]
}

export function getStaticFilesCollection() {
	return collection
}

export async function dispatchStatic(req, response) {
	const broker = findStaticBrokerByRoute(req.url)

	setTimeout(async () => {
		if (!broker || broker.should404) { // TESTME
			sendNotFound(response)
			return
		}
		const file = broker.resolvedPath
		if (req.headers.range)
			await sendPartialContent(response, req.headers.range, file)
		else {
			response.setHeader('Content-Type', mimeFor(file))
			response.end(readFileSync(file))
		}
	}, Number(broker.delayed && calcDelay()))
}

