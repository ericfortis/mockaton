import { cookie } from './cookie.js'
import { MockBroker } from './MockBroker.js'
import { listFilesRecursively } from './utils/fs.js'
import { config, isFileAllowed } from './config.js'
import { parseFilename, filenameIsValid } from './Filename.js'


/**
 * @type {{
 * [method: string]:
 *   { [route: string]: MockBroker }
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

export function init() {
	collection = {}
	cookie.init(config.cookies)

	listFilesRecursively(config.mocksDir)
		.sort()
		.forEach(f => registerMock(f))

	forEachBroker(broker => {
		broker.ensureItHas500()
		broker.selectDefaultFile()
	})
}

/** @returns {boolean} registered */
export function registerMock(file, isFromWatcher = false) {
	if (findBrokerByFilename(file)?.hasMock(file)
		|| !isFileAllowed(file) // TODO basename(file) 
		|| !filenameIsValid(file))
		return false

	const { method, urlMask } = parseFilename(file)
	collection[method] ??= {}

	if (!collection[method][urlMask])
		collection[method][urlMask] = new MockBroker(file)
	else
		collection[method][urlMask].register(file)

	if (isFromWatcher && !this.file)
		collection[method][urlMask].selectDefaultFile()

	if (isFromWatcher)
		collection[method][urlMask].ensureItHas500()

	return true
}

export function unregisterMock(file) {
	const broker = findBrokerByFilename(file)
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

export const getAll = () => collection


/** @returns {MockBroker | undefined} */
export function findBrokerByFilename(file) {
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
export function findBrokerByRoute(method, url) {
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
	forEachBroker(broker =>
		broker.setByMatchingComment(comment))
}

export function ensureAllRoutesHaveSelectedMock() {
	forEachBroker(broker => {
		if (broker.proxied)
			broker.selectDefaultFile()
	})
}

function forEachBroker(fn) {
	for (const brokers of Object.values(collection))
		Object.values(brokers).forEach(fn)
}

