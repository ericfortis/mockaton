import { API, DF, LONG_POLL_SERVER_TIMEOUT } from './ApiConstants.js'


/** Client for controlling Mockaton via its HTTP API */
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

	/** @type {JsonPromise<ClientBrokersByMethod>} */
	listMocks() {
		return this.#get(API.mocks)
	}

	/** @type {JsonPromise<ClientStaticBrokers>} */
	listStaticFiles() {
		return this.#get(API.static)
	}

	/** @type {JsonPromise<[label:string, selected:boolean][]>} */
	listCookies() {
		return this.#get(API.cookies)
	}

	/** @type {JsonPromise<string[]>} */
	listComments() {
		return this.#get(API.comments)
	}

	/** @type {JsonPromise<string>} */
	getProxyFallback() {
		return this.#get(API.fallback)
	}

	/** @type {JsonPromise<boolean>} */
	getCollectProxied() {
		return this.#get(API.collectProxied)
	}

	/** @type {JsonPromise<boolean>} */
	getCorsAllowed() {
		return this.#get(API.cors)
	}

	/** @type {JsonPromise<number>} */
	getGlobalDelay() {
		return this.#get(API.globalDelay)
	}

	/** @type {JsonPromise<number>} */
	getSyncVersion(currentSyncVersion, abortSignal) {
		return fetch(API.syncVersion, {
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
