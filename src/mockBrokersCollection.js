import { Config } from './Config.js'
import { cookie } from './cookie.js'
import { MockBroker } from './MockBroker.js'
import { listFilesRecursively } from './utils/fs.js'
import { parseFilename, filenameIsValid } from './Filename.js'


/**
 * @example
 * {
 *   GET: {
 *     /api/route-a: <MockBroker>
 *     /api/route-b: <MockBroker>
 *   },
 *   POST: {…}
 * }
 */
let collection = {}

export function init() {
	collection = {}
	cookie.init(Config.cookies)

	const files = listFilesRecursively(Config.mocksDir)
		.sort()
		.filter(f => !Config.ignore.test(f) && filenameIsValid(f))

	for (const file of files) {
		const { method, urlMask } = parseFilename(file)
		collection[method] ??= {}
		if (!collection[method][urlMask])
			collection[method][urlMask] = new MockBroker(file)
		else
			collection[method][urlMask].register(file)
	}

	forEachBroker(broker => broker.ensureItHas500())
}

function forEachBroker(fn) {
	for (const brokers of Object.values(collection))
		Object.values(brokers).forEach(fn)
}

export const getAll = () => collection

export const getBrokerByFilename = file => {
	const { method, urlMask } = parseFilename(file)
	if (collection[method])
		return collection[method][urlMask]
}

// Searching the routes in reverse order so dynamic params (e.g.
// /user/[id]) don’t take precedence over exact paths (e.g.
// /user/name). That’s because "[]" chars are lower than alphanumeric ones.
// BTW, `urlMasks` always start with "/", so there’s no need to
// worry about the primacy of array-like keys when iterating.
export function getBrokerForUrl(method, url) {
	if (!collection[method])
		return
	const brokers = Object.values(collection[method])
	for (let i = brokers.length - 1; i >= 0; i--)
		if (brokers[i].urlMaskMatches(url))
			return brokers[i]
}

export function extractAllComments() {
	const comments = new Set()
	forEachBroker(broker => {
		for (const c of broker.extractComments())
			comments.add(c)
	})
	return Array.from(comments)
}

export function setMocksMatchingComment(comment) {
	forEachBroker(broker => broker.setByMatchingComment(comment))
}


