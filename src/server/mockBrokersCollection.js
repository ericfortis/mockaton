import { basename } from 'node:path'

import { cookie } from './cookie.js'
import { MockBroker } from './MockBroker.js'
import { parseFilename } from '../client/Filename.js'
import { listFilesRecursively } from './utils/fs.js'
import { config, isFileAllowed } from './config.js'


/**
 * @type {{
 * 	[method: string]: {
 * 		[urlMask: string]: MockBroker
 * 	}
 * }}
 * @example
 * {
 *   GET: {
 *     '/api/route-a': mockBrokerA,
 *     '/api/route-b': mockBrokerB
 *   },
 *   POST: {…}
 * }
 */
let collection = {}

export const all = () => collection

export function init() {
	collection = {}
	cookie.init(config.cookies)

	listFilesRecursively(config.mocksDir)
		.sort()
		.forEach(f => registerMock(f))

	forEachBroker(b => b.selectDefaultFile())
}

/** @returns {boolean} registered */
export function registerMock(file, isFromWatcher = false) {
	if (brokerByFilename(file)?.hasMock(file)
		|| !isFileAllowed(basename(file)))
		return false

	const { method, urlMask } = parseFilename(file)
	collection[method] ??= {}

	let broker = collection[method][urlMask]

	if (!broker)
		broker = collection[method][urlMask] = new MockBroker(file)
	else
		broker.register(file)

	if (isFromWatcher && !broker.file)
		broker.selectDefaultFile()

	return true
}

export function unregisterMock(file) {
	const broker = brokerByFilename(file)
	const methodHasNoMoreMocks = broker?.unregister(file) // TODO or it was a directory of many mocks
	if (methodHasNoMoreMocks) {
		const { method, urlMask } = parseFilename(file)
		delete collection[method][urlMask]
		if (!Object.keys(collection[method]).length)
			delete collection[method]
	}
}


/** @returns {MockBroker | undefined} */
export function brokerByFilename(file) {
	const { method, urlMask } = parseFilename(file)
	return collection[method]?.[urlMask]
}

/**
 * Searching routes in reverse order so dynamic params (e.g.
 * /user/[id]) don’t take precedence over exact paths (e.g.
 * /user/name). That’s because "[]" chars are lower than alphanumeric ones.
 * BTW, `urlMasks` always start with "/", so there’s no need to
 * worry about the primacy of array-like keys when iterating.
 @returns {MockBroker | undefined} */
export function brokerByRoute(method, url) {
	const brokers = Object.values(collection[method] || {})
	for (let i = brokers.length - 1; i >= 0; i--)
		if (brokers[i].urlMaskMatches(url))
			return brokers[i]

	// TODO Verify
	if (method === 'GET') {
		const indexUrl = url.endsWith('/') ? url + 'index.html' : url + '/index.html'
		for (let i = brokers.length - 1; i >= 0; i--)
			if (brokers[i].urlMaskMatches(indexUrl))
				return brokers[i]
	}
}

export function extractAllComments() {
	const comments = new Set()
	forEachBroker(b => {
		for (const c of b.extractComments())
			comments.add(c)
	})
	return Array.from(comments).sort()
}

export function setMocksMatchingComment(comment) {
	forEachBroker(b =>
		b.setByMatchingComment(comment))
}

function forEachBroker(fn) {
	for (const brokers of Object.values(collection))
		Object.values(brokers).forEach(fn)
}

