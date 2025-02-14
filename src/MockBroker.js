import { config } from './config.js'
import { includesComment, extractComments, parseFilename } from './Filename.js'
import { DEFAULT_500_COMMENT, DEFAULT_MOCK_COMMENT } from './ApiConstants.js'


// MockBroker is a state for a particular route. It knows the available mock files
// that can be served for the route, the currently selected file, and its delay.
export class MockBroker {
	#urlRegex
	constructor(file) {
		const { urlMask } = parseFilename(file)
		this.#urlRegex = new RegExp('^' + disregardVariables(removeQueryStringAndFragment(urlMask)) + '/*$')
		this.mocks = []
		this.currentMock = {
			file: '',
			delay: 0
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

	// Appending a '/' so URLs ending with variables don't match
	// URLs that have a path after that variable. For example,
	// without it, the following regex would match both of these URLs:
	//   api/foo/[route_id] => api/foo/.*  (wrong match because it’s too greedy)
	//   api/foo/[route_id]/suffix => api/foo/.*/suffix
	// By the same token, the regex handles many trailing
	// slashes. For instance, for routing api/foo/[id]?qs…
	urlMaskMatches(url) {
		return this.#urlRegex.test(removeQueryStringAndFragment(decodeURIComponent(url)) + '/')
	}

	get file() { return this.currentMock.file }
	get delay() { return this.currentMock.delay }
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
	updateDelay(delayed) { this.currentMock.delay = Number(delayed) * config.delay }

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

// Stars out (for regex) all the paths that are in square brackets
function disregardVariables(urlMask) {
	return urlMask.replace(/\[.*?]/g, '[^/]*')
}

function removeQueryStringAndFragment(urlMask) {
	return urlMask.replace(/[?#].*/, '')
}

