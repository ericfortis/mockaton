import { join } from 'node:path'
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
		.filter(isFileAllowed)
		.sort()
		.forEach(f => registerStatic(f))
}

function registerStatic(file) {
	file = '/' + file
	collection[file] = new StaticBroker(file)
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

