import { API, DF } from './ApiConstants.js'


export class Commander {
	#addr = ''
	constructor(addr) {
		this.#addr = addr
	}

	#get(api) {
		return fetch(this.#addr + api)
	}
	#patch(api, body) {
		return fetch(this.#addr + api, {
			method: 'PATCH',
			body: JSON.stringify(body)
		})
	}

	listMocks() {
		return this.#get(API.mocks)
	}

	select(file) {
		return this.#patch(API.select, file)
	}
	bulkSelectByComment(comment) {
		return this.#patch(API.bulkSelect, comment)
	}

	setRouteIsDelayed(routeMethod, routeUrlMask, delayed) {
		return this.#patch(API.delay, {
			[DF.routeMethod]: routeMethod,
			[DF.routeUrlMask]: routeUrlMask,
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

	getProxyFallback() {
		return this.#get(API.fallback)
	}
	setProxyFallback(proxyAddr) {
		return this.#patch(API.fallback, proxyAddr)
	}

	setCollectProxied(shouldCollect) {
		return this.#patch(API.collectProxied, shouldCollect)
	}

	reset() {
		return this.#patch(API.reset)
	}

	getCorsAllowed() {
		return this.#get(API.cors)
	}
	setCorsAllowed(value) {
		return this.#patch(API.cors, value)
	}

	listStaticFiles() {
		return this.#get(API.static)
	}
}
