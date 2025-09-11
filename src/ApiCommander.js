import { API, DF, LONG_POLL_SERVER_TIMEOUT } from './ApiConstants.js'


/** Client for controlling Mockaton via its HTTP API */
export class Commander {
	#addr = ''
	constructor(addr) {
		this.#addr = addr
	}

	#patch(api, body) {
		return fetch(this.#addr + api, {
			method: 'PATCH',
			body: JSON.stringify(body)
		})
	}

	/** @returns {JsonPromise<State>} */
	getState() {
		return fetch(this.#addr + API.state)
	}
	
	/** @returns {JsonPromise<number>} */
	getSyncVersion(currentSyncVersion, abortSignal) {
		return fetch(this.#addr + API.syncVersion, {
			signal: AbortSignal.any([abortSignal, AbortSignal.timeout(LONG_POLL_SERVER_TIMEOUT + 1000)]),
			headers: {
				[DF.syncVersion]: currentSyncVersion
			}
		})
	}


	reset() {
		return this.#patch(API.reset)
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

	setStaticRouteIsDelayed(routeUrlMask, delayed) {
		return this.#patch(API.delayStatic, {
			[DF.routeUrlMask]: routeUrlMask,
			[DF.delayed]: delayed
		})
	}

	setStaticRouteStatus(routeUrlMask, status) {
		return this.#patch(API.staticStatus, {
			[DF.routeUrlMask]: routeUrlMask,
			[DF.statusCode]: status
		})
	}

	setRouteIsProxied(routeMethod, routeUrlMask, proxied) {
		return this.#patch(API.proxied, {
			[DF.routeMethod]: routeMethod,
			[DF.routeUrlMask]: routeUrlMask,
			[DF.proxied]: proxied
		})
	}

	selectCookie(cookieKey) {
		return this.#patch(API.cookies, cookieKey)
	}

	setProxyFallback(proxyAddr) {
		return this.#patch(API.fallback, proxyAddr)
	}

	setCollectProxied(shouldCollect) {
		return this.#patch(API.collectProxied, shouldCollect)
	}

	setCorsAllowed(value) {
		return this.#patch(API.cors, value)
	}

	setGlobalDelay(delay) {
		return this.#patch(API.globalDelay, delay)
	}
}
