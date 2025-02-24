import { includesComment, extractComments, parseFilename } from './Filename.js'
import { DEFAULT_500_COMMENT, DEFAULT_MOCK_COMMENT } from './ApiConstants.js'


// MockBroker is a state for a particular route. It knows the available mock files
// that can be served for the route, the currently selected file, and its delay.
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

	register(file) {
		if (parseFilename(file).status === 500) {
			this.#deleteTemp500()
			if (this.temp500IsSelected)
				this.updateFile(file)
		}
		this.mocks.push(file)
		this.#sortMocks()
	}

	#deleteTemp500() {
		this.mocks = this.mocks.filter(file => !this.#isTemp500(file))
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

	get file() { return this.currentMock.file }
	get delayed() { return this.currentMock.delayed }
	get proxied() { return !this.currentMock.file }
	get status() { return parseFilename(this.file).status }
	get temp500IsSelected() { return this.#isTemp500(this.file) }

	#isTemp500(file) { return includesComment(file, DEFAULT_500_COMMENT) }

	#sortMocks() {
		this.mocks.sort()
		const defaults = this.mocks.filter(file => includesComment(file, DEFAULT_MOCK_COMMENT))
		const temp500 = this.mocks.filter(file => includesComment(file, DEFAULT_500_COMMENT))
		this.mocks = [
			...defaults,
			...this.mocks.filter(file => !defaults.includes(file) && !temp500.includes(file)),
			...temp500
		]
	}

	selectDefaultFile() {
		this.updateFile(this.mocks[0])
	}

	hasMock(file) { return this.mocks.includes(file) }
	updateFile(filename) { this.currentMock.file = filename }
	updateDelayed(delayed) { this.currentMock.delayed = delayed }

	updateProxied(proxied) {
		if (proxied)
			this.updateFile('')
		else
			this.selectDefaultFile()
	}

	setByMatchingComment(comment) {
		for (const file of this.mocks)
			if (includesComment(file, comment)) {
				this.updateFile(file)
				break
			}
	}

	extractComments() {
		const comments = []
		for (const file of this.mocks)
			comments.push(...extractComments(file))
		return comments
	}

	ensureItHas500() {
		if (!this.#has500())
			this.#registerTemp500()
	}
	#has500() {
		return this.mocks.some(mock => parseFilename(mock).status === 500)
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

