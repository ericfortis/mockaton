import { basename } from 'node:path'

import { logger } from './utils/logger.js'
import { cookie } from './cookie.js'
import { MockBroker } from './MockBroker.js'
import { listFilesRecursively } from './utils/fs.js'
import { config, isFileAllowed } from './config.js'
import { parseFilename, validateFilename } from './Filename.js'


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
		|| !isFileAllowed(basename(file)) // TESTME
		|| !filenameIsValid(file))
		return false

	const { method, urlMask } = parseFilename(file)
	collection[method] ??= {}

	if (!collection[method][urlMask])
		collection[method][urlMask] = new MockBroker(file)
	else
		collection[method][urlMask].register(file)

	if (isFromWatcher && !collection[method][urlMask].file) // TESTME e.g. auto500 is selected and adding a new one
		collection[method][urlMask].selectDefaultFile()

	return true
}

function filenameIsValid(file) {
	const error = validateFilename(file)
	if (error)
		logger.warn(error, file)
	return !error
}

export function unregisterMock(file) {
	const broker = brokerByFilename(file)
	if (!broker)
		return
	const isEmpty = broker.unregister(file)
	if (isEmpty) {
		const { method, urlMask } = parseFilename(file)
		delete collection[method][urlMask]
		if (!Object.keys(collection[method]).length)
			delete collection[method]
	}
}


/** @returns {MockBroker | undefined} */
export function brokerByFilename(file) {
	const { method, urlMask } = parseFilename(file)
	if (collection[method])
		return collection[method][urlMask]
}

/**
 * Searching routes in reverse order so dynamic params (e.g.
 * /user/[id]) don’t take precedence over exact paths (e.g.
 * /user/name). That’s because "[]" chars are lower than alphanumeric ones.
 * BTW, `urlMasks` always start with "/", so there’s no need to
 * worry about the primacy of array-like keys when iterating.
 @returns {MockBroker | undefined} */
export function brokerByRoute(method, url) {
	if (!collection[method])
		return
	const brokers = Object.values(collection[method])
	for (let i = brokers.length - 1; i >= 0; i--)
		if (brokers[i].urlMaskMatches(url))
			return brokers[i]
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

