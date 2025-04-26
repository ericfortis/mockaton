import { includesComment, extractComments, parseFilename } from './Filename.js'
import { DEFAULT_500_COMMENT, DEFAULT_MOCK_COMMENT } from './ApiConstants.js'


// MockBroker is a state for a particular route. It knows the available mock files
// that can be served for the route, the currently selected file, and if it’s delayed.
export class MockBroker {
	constructor(file) {
		this.urlMaskMatches = new UrlMatcher(file).urlMaskMatches
		this.mocks = []
		this.currentMock = {
			file: '',
			delayed: false
		}
		this.register(file)
	}

	get file() { return this.currentMock.file }
	get status() { return parseFilename(this.file).status }
	get delayed() { return this.currentMock.delayed }
	get proxied() { return !this.currentMock.file }
	get temp500IsSelected() { return this.#isTemp500(this.file) }

	hasMock(file) { return this.mocks.includes(file) }

	register(file) {
		if (this.#is500(file)) {
			if (this.temp500IsSelected)
				this.selectFile(file)
			this.#deleteTemp500()
		}
		this.mocks.push(file)
		this.#sortMocks()
	}

	#is500(file) {
		return parseFilename(file).status === 500
	}

	#deleteTemp500() {
		this.mocks = this.mocks.filter(file => !this.#isTemp500(file))
	}

	#isTemp500(file) {
		return includesComment(file, DEFAULT_500_COMMENT)
	}

	#sortMocks() {
		this.mocks.sort()
		const defaults = this.mocks.filter(file => includesComment(file, DEFAULT_MOCK_COMMENT))
		const temp500 = this.mocks.filter(this.#isTemp500)
		this.mocks = [
			...defaults,
			...this.mocks.filter(file => !defaults.includes(file) && !temp500.includes(file)),
			...temp500
		]
	}

	ensureItHas500() {
		if (!this.mocks.some(this.#is500))
			this.#registerTemp500()
	}
	#registerTemp500() {
		const { urlMask, method } = parseFilename(this.mocks[0])
		const file = urlMask.replace(/^\//, '') // Removes leading slash
		this.mocks.push(`${file}${DEFAULT_500_COMMENT}.${method}.500.empty`)
	}

	unregister(file) {
		this.mocks = this.mocks.filter(f => f !== file)
		const isEmpty = !this.mocks.length
			|| this.mocks.length === 1 && this.#isTemp500(this.mocks[0])
		if (!isEmpty && this.file === file)
			this.selectDefaultFile()
		return isEmpty
	}

	selectDefaultFile() {
		this.selectFile(this.mocks[0])
	}

	selectFile(filename) {
		this.currentMock.file = filename
	}

	updateDelayed(delayed) {
		this.currentMock.delayed = delayed
	}

	updateProxied(proxied) {
		if (proxied)
			this.selectFile('')
		else
			this.selectDefaultFile()
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

