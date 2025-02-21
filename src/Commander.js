import { API, DF, LONG_POLL_SERVER_TIMEOUT } from './ApiConstants.js'


// Client for controlling Mockaton via its HTTP API
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

	setRouteIsProxied(routeMethod, routeUrlMask, proxied) {
		return this.#patch(API.proxied, {
			[DF.routeMethod]: routeMethod,
			[DF.routeUrlMask]: routeUrlMask,
			[DF.proxied]: proxied
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

	getCollectProxied() {
		return this.#get(API.collectProxied)
	}
	setCollectProxied(shouldCollect) {
		return this.#patch(API.collectProxied, shouldCollect)
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

	reset() {
		return this.#patch(API.reset)
	}

	getAR_EventsCount(nAR_EventReceived) {
		return fetch(API.arEvents, {
			signal: AbortSignal.timeout(LONG_POLL_SERVER_TIMEOUT + 1000),
			headers: {
				[DF.lastReceived_nAR]: nAR_EventReceived
			}
		})
	}
}
