import { Config } from './Config.js'
import { DEFAULT_500_COMMENT } from './ApiConstants.js'
import { Route, includesComment, extractComments, parseFilename } from './Route.js'


// MockBroker is a state for a particular route. It knows the available mock files
// that can be served for the route, the currently selected file, and its delay.
export class MockBroker {
	#route

	constructor(file) {
		this.#route = new Route(parseFilename(file).urlMask)
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

	urlMaskMatches(url) { return this.#route.urlMaskMatches(url) }

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
