import { join, basename } from 'node:path'
import { listFilesRecursively } from './utils/fs.js'
import { config, isFileAllowed } from './config.js'


class StaticBroker {
	constructor(route) {
		this.route = route
		this.delayed = false
		this.status = 200 // 200 or 404
	}

	setDelayed(value) { this.delayed = value }
	setStatus(value) { this.status = value }
}

/** @type {{ [route:string]: StaticBroker }} */
let collection = {}

export const all = () => collection

export function init() {
	collection = {}
	listFilesRecursively(config.staticDir)
		.sort()
		.forEach(registerMock)
}


/** @returns {boolean} registered */
export function registerMock(relativeFile) {
	if (!isFileAllowed(basename(relativeFile))) // TESTME
		return false

	const route = '/' + relativeFile
	if (brokerByRoute(route))
		return false

	collection[route] = new StaticBroker(route)
	return true
}


export function unregisterMock(relativeFile) {
	delete collection['/' + relativeFile]
}


/** @returns {StaticBroker | undefined} */
export function brokerByRoute(route) {
	return collection[route] || collection[join(route, 'index.html')]
}




