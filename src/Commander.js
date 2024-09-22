import { API, DF } from './ApiConstants.js'


export class Commander {
	#addr = ''
	constructor(addr) {
		this.#addr = addr
	}

	select(file) {
		return this.#patch(API.edit, { [DF.file]: file })
	}
	setMockIsDelayed(file, delayed) { // selects the file as well
		return this.#patch(API.edit, {
			[DF.file]: file,
			[DF.delayed]: delayed
		})
	}

	listCookies() {
		return this.#get(API.cookies)
	}
	selectCookie(cookieKey) {
		return this.#patch(API.cookies, cookieKey)
	}

	listComments() {
		return this.#get(API.comments)
	}
	bulkSelectByComment(comment) {
		return this.#patch(API.bulkSelect, comment)
	}

	setFallback(proxyAddr) {
		return this.#patch(API.fallback, proxyAddr)
	}

	reset() {
		return this.#patch(API.reset)
	}


	#patch(api, body) {
		return fetch(this.#addr + api, {
			method: 'PATCH',
			body: JSON.stringify(body)
		})
	}

	#get(api) {
		return fetch(this.#addr + api)
	}
}
