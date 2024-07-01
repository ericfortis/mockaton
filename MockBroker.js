import { join } from 'node:path'
import { existsSync, lstatSync, writeFileSync } from 'node:fs'

import { Route } from './Route.js'
import { Config } from './Config.js'


// MockBroker is a state for a particular route. It knows the available mock files
// that can be served for the route, the currently selected file, and its delay. Also,
// knows if the route has js preprocessors (transforms) and documentation (md).
export class MockBroker {
	#route

	constructor(file) {
		this.#route = new Route(file)
		this.method = this.#route.method

		this.documentation = '' // .md

		this.mocks = [] // *.json,txt
		this.currentMock = {
			file: '',
			status: 200,
			delay: 0
		}

		this.transforms = [] // *.js
		this.currentTransform = ''

		this.register(file)
	}

	register(file) {
		if (file.endsWith('.md'))
			this.documentation = file
		else if (file.endsWith('.mjs'))
			this.transforms.push(file)
		else {
			if (!this.mocks.length) {
				this.currentMock.file = file // The first mock file option for a particular route becomes the default
				this.currentMock.status = Route.parseFilename(file).status
			}
			this.mocks.push(file)
		}
	}

	urlMaskMatches(url) { return this.#route.urlMaskMatches(url) }

	get file() { return this.currentMock.file }
	get status() { return this.currentMock.status }
	get delay() { return this.currentMock.delay }

	updateFile(filename) {
		this.currentMock.file = filename
		this.currentMock.status = Route.parseFilename(filename).status
	}

	updateDelay(delayed) {
		this.currentMock.delay = Number(delayed) * Config.delay
	}

	updateTransform(filename) {
		this.currentTransform = filename
	}

	setByMatchingComment(comment) {
		for (const file of this.mocks)
			if (Route.hasInParentheses(file, comment)) {
				this.updateFile(file)
				break
			}
		for (const file of this.transforms)
			if (Route.hasInParentheses(file, comment)) {
				this.updateTransform(file)
				break
			}
	}

	extractComments() {
		let comments = []
		for (const file of [...this.mocks, ...this.transforms])
			comments = comments.concat(Route.extractComments(file))
		return comments
	}

	ensureItHas501() {
		if (!this.#has501())
			this.#write501()
	}

	#has501() {
		return this.mocks.some(mock => 
			Route.parseFilename(mock).status === 501)
	}

	#write501() {
		// TODO handle route with transforms but without mocks
		const { urlMask, method } = Route.parseFilename(this.mocks[0])
		let mask = urlMask
		const t = join(Config.mocksDir, urlMask)
		if (existsSync(t) && lstatSync(t).isDirectory())
			mask = urlMask + '/'
		const file = `${mask}.${method}.501.txt`
		writeFileSync(join(Config.mocksDir, file), '')
		this.register(file)
	}
}
