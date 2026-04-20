import { DEFAULT_MOCK_COMMENT } from '../client/ApiConstants.js'
import { parseFilename, includesComment, extractComments, removeQueryStringAndFragment } from '../client/Filename.js'


/**
 * MockBroker is a state for a particular route. It knows the available mock
 * files that can be served for the route, the currently selected file, etc.
 */
export class MockBroker {
	file = '' // selected mock filename
	mocks = [] // filenames
	isStatic = false // doesn’t follow filename convention
	delayed = false
	proxied = false
	status = -1
	autoStatus = 0
	
	constructor(file) {
		this.urlMaskMatches = new UrlMatcher(file).urlMaskMatches
		this.register(file)
	}

	register(file) {
		if (this.autoStatus && this.#isStatus(file, this.autoStatus))
			this.selectFile(file)
		this.mocks.push(file)
		this.#sortMocks()
	}

	unregister(file) {
		this.mocks = this.mocks.filter(f => f !== file)
		const brokerIsEmpty = !this.mocks.length
		if (!brokerIsEmpty && this.file === file)
			this.selectDefaultFile()
		return brokerIsEmpty
	}

	#isStatus = (file, status) => parseFilename(file).status === status

	#sortMocks() {
		this.mocks.sort()
		const defaults = this.mocks.filter(f => includesComment(f, DEFAULT_MOCK_COMMENT))
		this.mocks = Array.from(new Set(defaults).union(new Set(this.mocks)))
	}

	hasMock = file => this.mocks.includes(file)

	selectFile(filename) {
		const { status, isStatic } = parseFilename(filename)
		this.file = filename
		this.status = status
		this.isStatic = isStatic
		this.proxied = false
		this.autoStatus = 0
	}

	selectDefaultFile() {
		this.selectFile(this.mocks[0])
	}

	toggleStatus(status) {
		const shouldUnset = this.autoStatus === status || (!this.autoStatus && this.status === status)
		if (shouldUnset)
			this.selectDefaultFile()
		else {
			const fStatus = this.mocks.find(f => parseFilename(f).status === status)
			if (fStatus)
				this.selectFile(fStatus)
			else {
				this.autoStatus = status
				this.status = status
			}
		}
		this.proxied = false
	}

	setDelayed(delayed) {
		this.delayed = delayed
	}

	setProxied(proxied) {
		this.autoStatus = 0
		this.proxied = proxied
	}

	setByMatchingComment(comment) {
		for (const file of this.mocks)
			if (includesComment(file, comment)) {
				this.selectFile(file)
				break
			}
	}

	extractComments() {
		const comments = []
		for (const file of this.mocks)
			comments.push(...extractComments(file))
		return comments
	}
}



class UrlMatcher {
	#urlRegex
	constructor(file) {
		this.#urlRegex = this.#buildUrlRegex(file)
	}

	#buildUrlRegex(file) {
		let { urlMask } = parseFilename(file)
		urlMask = removeQueryStringAndFragment(urlMask)
		urlMask = this.#disregardVariables(urlMask)
		return new RegExp('^' + urlMask + '/*$')
	}

	#disregardVariables(str) { // Stars out all parts that are in square brackets
		return str.replace(/\[.*?]/g, '[^/]+')
	}

	// Appending a '/' so URLs ending with variables don't match
	// URLs that have a path after that variable. For example,
	// without it, the following regex would match both of these URLs:
	//   api/foo/[route_id] => api/foo/.*  (wrong match because it’s too greedy)
	//   api/foo/[route_id]/suffix => api/foo/.*/suffix
	// By the same token, the regex handles many trailing
	// slashes. For instance, for routing api/foo/[id]?qs…
	urlMaskMatches = (url) => {
		let u = decodeURIComponent(url)
		u = removeQueryStringAndFragment(u)
		u += '/'
		return this.#urlRegex.test(u)
	}
}

