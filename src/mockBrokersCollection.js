import { join } from 'node:path'
import { readdirSync as readDir, lstatSync } from 'node:fs'

import { Route } from './Route.js'
import { Config } from './Config.js'
import { cookie } from './cookie.js'
import { MockBroker } from './MockBroker.js'


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

	const files = readDir(Config.mocksDir, { recursive: true })
		.filter(f => Config.allowedExt.test(f) && lstatSync(join(Config.mocksDir, f)).isFile())
		.sort()

	for (const file of files) {
		const { error, method, urlMask } = Route.parseFilename(file)
		if (error) {
			console.error(error, file)
			continue
		}
		collection[method] ??= {}
		if (!collection[method][urlMask])
			collection[method][urlMask] = new MockBroker(file)
		else
			collection[method][urlMask].register(file)
	}

	if (Config.generate500)
		forEachBroker(broker => broker.ensureItHas500())
}

function forEachBroker(fn) {
	for (const brokers of Object.values(collection))
		Object.values(brokers).forEach(fn)
}


export const getAll = () => collection

export const getBrokerByFilename = file => {
	const { method, urlMask } = Route.parseFilename(file)
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
		for (const comment of broker.extractComments())
			comments.add(comment)
	})
	return Array.from(comments)
}

export function setMocksMatchingComment(comment) {
	forEachBroker(broker => broker.setByMatchingComment(comment))
}


