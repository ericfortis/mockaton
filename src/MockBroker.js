import { Config } from './Config.js'
import { DEFAULT_500_COMMENT } from './ApiConstants.js'
import { includesComment, extractComments, parseFilename } from './Filename.js'


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
		if (!this.mocks.length)
			this.currentMock.file = file // The first mock file option for a particular route becomes the default
		this.mocks.push(file)
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
	get status() { return parseFilename(this.file).status }
	get isTemp500() { return includesComment(this.file, DEFAULT_500_COMMENT) }

	updateFile(filename) {
		this.currentMock.file = filename
	}

	updateDelay(delayed) {
		this.currentMock.delay = Number(delayed) * Config.delay
	}

	setByMatchingComment(comment) {
		for (const file of this.mocks)
			if (includesComment(file, comment)) {
				this.updateFile(file)
				break
			}
	}

	extractComments() {
		let comments = []
		for (const file of this.mocks)
			comments = comments.concat(extractComments(file))
		return comments
	}

	ensureItHas500() {
		if (!this.#has500())
			this.#registerTemp500()
	}
	#has500() {
		return this.mocks.some(mock => parseFilename(mock).status === 500)
	}
	#registerTemp500() {
		const { urlMask, method } = parseFilename(this.mocks[0])
		const file = urlMask.replace(/^\//, '') // Removes leading slash TESTME
		this.register(`${file}${DEFAULT_500_COMMENT}.${method}.500.txt`)
	}
}

// Stars out (for regex) all the paths that are in square brackets
function disregardVariables(urlMask) {
	return urlMask.replace(/\[.*?]/g, '[^/]*')
}

function removeQueryStringAndFragment(urlMask) {
	return urlMask.replace(/[?#].*/, '')
}

