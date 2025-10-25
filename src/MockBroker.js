import { includesComment, extractComments, parseFilename } from './Filename.js'
import { DEFAULT_MOCK_COMMENT } from './ApiConstants.js'


/** MockBroker is a state for a particular route. It knows the available mock files
 * that can be served for the route, the currently selected file, and if it’s delayed. */
export class MockBroker {
	constructor(file) {
		this.delayed = false
		this.proxied = false
		this.auto500 = false
		this.status = -1
		this.mocks = [] // filenames
		this.file = '' // selected mock filename
		this.urlMaskMatches = new UrlMatcher(file).urlMaskMatches
		this.register(file)
	}

	hasMock(file) {
		return this.mocks.includes(file)
	}

	register(file) {
		if (this.#is500(file) && this.auto500)
			this.selectFile(file)
		this.mocks.push(file)
		this.#sortMocks()
	}

	#is500(file) {
		return parseFilename(file).status === 500
	}

	#sortMocks() {
		this.mocks.sort()
		const defaults = this.mocks.filter(file => includesComment(file, DEFAULT_MOCK_COMMENT))
		this.mocks = [
			...defaults,
			...this.mocks.filter(file => !defaults.includes(file)),
		]
	}

	unregister(file) {
		this.mocks = this.mocks.filter(f => f !== file)
		const isEmpty = !this.mocks.length
		if (!isEmpty && this.file === file)
			this.selectDefaultFile()
		return isEmpty
	}

	selectDefaultFile() {
		this.selectFile(this.mocks[0])
	}

	selectFile(filename) {
		this.file = filename
		this.proxied = false
		this.auto500 = false
		this.status = parseFilename(filename).status
	}

	toggle500() {
		this.proxied = false // TESTME
		if (this.auto500 || this.status === 500)
			this.selectDefaultFile()
		else {
			const f = this.mocks.find(this.#is500)
			if (f)
				this.selectFile(f)
			else {
				this.auto500 = true
				this.status = 500 // TESTME
			}
		}
	}

	setDelayed(delayed) {
		this.delayed = delayed
	}

	setProxied(proxied) {
		this.auto500 = false // TESTME
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
		urlMask = this.#removeQueryStringAndFragment(urlMask)
		urlMask = this.#disregardVariables(urlMask)
		return new RegExp('^' + urlMask + '/*$')
	}

	#removeQueryStringAndFragment(str) {
		return str.replace(/[?#].*/, '')
	}

	#disregardVariables(str) { // Stars out all parts that are in square brackets
		return str.replace(/\[.*?]/g, '[^/]*')
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
		u = this.#removeQueryStringAndFragment(u)
		u += '/'
		return this.#urlRegex.test(u)
	}
}

