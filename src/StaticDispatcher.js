import { readFileSync } from 'node:fs'
import { join, basename } from 'node:path'

import { mimeFor } from './utils/mime.js'
import { listFilesRecursively } from './utils/fs.js'
import { config, isFileAllowed, calcDelay } from './config.js'
import { sendPartialContent, sendNotFound } from './utils/http-response.js'


class StaticBroker {
	constructor(route) {
		this.route = route
		this.delayed = false
		this.status = 200 // 200 or 404
	}

	setDelayed(value) { this.delayed = value }
	setStatus(value) { this.status = value }
}

/** @type {{ [route: string]: StaticBroker }} */
let collection = {}

export function initStaticCollection() {
	collection = {}
	listFilesRecursively(config.staticDir)
		.sort()
		.forEach(registerStaticMock)
}


/** @returns {boolean} registered */
export function registerStaticMock(relativeFile) {
	if (!isFileAllowed(basename(relativeFile)))
		return false

	const route = '/' + relativeFile
	if (findStaticBrokerByRoute(route))
		return false

	collection[route] = new StaticBroker(route)
	return true
}


export function unregisterStaticMock(relativeFile) {
	delete collection['/' + relativeFile]
}


/** @returns {StaticBroker | undefined} */
export function findStaticBrokerByRoute(route) {
	return collection[route] || collection[join(route, 'index.html')]
}

export function getStaticFilesCollection() {
	return collection
}


export async function dispatchStatic(req, response) {
	const broker = findStaticBrokerByRoute(req.url)

	setTimeout(async () => {
		if (!broker || broker.status === 404) { // TESTME
			sendNotFound(response)
			return
		}
		const file = join(config.staticDir, broker.route)
		if (req.headers.range)
			await sendPartialContent(response, req.headers.range, file)
		else {
			response.setHeader('Content-Type', mimeFor(file))
			response.end(readFileSync(file))
		}
	}, Number(broker.delayed && calcDelay()))
}

