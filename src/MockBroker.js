import { join } from 'node:path'
import { existsSync, lstatSync } from 'node:fs'

import { Route } from './Route.js'
import { Config } from './Config.js'
import { DEFAULT_500_COMMENT } from './ApiConstants.js'


// MockBroker is a state for a particular route. It knows the available
// mock files that can be served for the route, the currently selected
// file, and its delay. Also, knows if the route has documentation (md)
export class MockBroker {
	#route

	constructor(file) {
		this.#route = new Route(file)
		this.method = this.#route.method

		this.documentation = '' // .md

		this.mocks = [] // *.json,txt,js
		this.currentMock = {
			file: '',
			delay: 0
		}

		this.register(file)
	}

	register(file) {
		if (file.endsWith('.md'))
			this.documentation = file
		else {
			if (!this.mocks.length)
				this.currentMock.file = file // The first mock file option for a particular route becomes the default
			this.mocks.push(file)
		}
	}

	urlMaskMatches(url) { return this.#route.urlMaskMatches(url) }

	get file() { return this.currentMock.file }
	get delay() { return this.currentMock.delay }
	get status() { return Route.parseFilename(this.file).status }
	get isTemp500() { return Route.hasInParentheses(this.file, DEFAULT_500_COMMENT) }

	updateFile(filename) {
		this.currentMock.file = filename
	}

	updateDelay(delayed) {
		this.currentMock.delay = Number(delayed) * Config.delay
	}

	setByMatchingComment(comment) {
		for (const file of this.mocks)
			if (Route.hasInParentheses(file, comment)) {
				this.updateFile(file)
				break
			}
	}

	extractComments() {
		let comments = []
		for (const file of this.mocks)
			comments = comments.concat(Route.extractComments(file))
		return comments
	}

	ensureItHas500() {
		if (!this.#has500())
			this.#registerTemp500()
	}

	#has500() {
		return this.mocks.some(mock =>
			Route.parseFilename(mock).status === 500)
	}

	#registerTemp500() {
		const { urlMask, method } = Route.parseFilename(this.mocks[0])
		let mask = urlMask
		const t = join(Config.mocksDir, urlMask)
		if (existsSync(t) && lstatSync(t).isDirectory())
			mask = urlMask + '/'
		mask = mask.replace(/^\//, '') // remove initial slash
		const file = `${mask}${DEFAULT_500_COMMENT}.${method}.500.txt`
		this.register(file)
	}
}
