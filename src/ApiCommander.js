import { API, LONG_POLL_SERVER_TIMEOUT, HEADER_SYNC_VERSION } from './ApiConstants.js'


/** Client for controlling Mockaton via its HTTP API */
export class Commander {
	#addr = ''

	constructor(addr) {
		this.#addr = addr
	}

	#patch = (api, body) =>
		fetch(this.#addr + api, {
			method: 'PATCH',
			body: JSON.stringify(body)
		})

	/** @returns {JsonPromise<State>} */
	getState = () =>
		fetch(this.#addr + API.state)

	/** @returns {JsonPromise<number>} */
	getSyncVersion = (currSyncVer, abortSignal) =>
		fetch(this.#addr + API.syncVersion, {
			signal: AbortSignal.any([
				abortSignal,
				AbortSignal.timeout(LONG_POLL_SERVER_TIMEOUT + 1000)
			]),
			headers: {
				[HEADER_SYNC_VERSION]: currSyncVer
			}
		})


	reset() {
		return this.#patch(API.reset)
	}

	setGlobalDelay(delay) {
		return this.#patch(API.globalDelay, delay)
	}

	bulkSelectByComment(comment) {
		return this.#patch(API.bulkSelect, comment)
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

	
	select(file) {
		return this.#patch(API.select, file)
	}

	toggle500(method, urlMask) {
		return this.#patch(API.toggle500, [method, urlMask])
	}

	setRouteIsDelayed(method, urlMask, delayed) {
		return this.#patch(API.delay, [method, urlMask, delayed])
	}

	setRouteIsProxied(method, urlMask, proxied) {
		return this.#patch(API.proxied, [method, urlMask, proxied])
	}
	

	setStaticRouteIsDelayed(urlMask, delayed) {
		return this.#patch(API.delayStatic, [urlMask, delayed])
	}

	setStaticRouteStatus(urlMask, status) {
		return this.#patch(API.staticStatus, [urlMask, status])
	}
}
