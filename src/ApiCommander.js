import { API, LONG_POLL_SERVER_TIMEOUT, HEADER_SYNC_VERSION } from './ApiConstants.js'


/** Client for controlling Mockaton via its HTTP API */
export class Commander {
	#addr = ''

	constructor(addr) {
		this.#addr = addr
	}

	/** @returns {JsonPromise<State>} */
	getState = () =>
		fetch(this.#addr + API.state)

	/** @returns {JsonPromise<number>} */
	getSyncVersion = (currSyncVer, abortSignal = undefined) =>
		fetch(this.#addr + API.syncVersion, {
			signal: AbortSignal.any([
				abortSignal,
				AbortSignal.timeout(LONG_POLL_SERVER_TIMEOUT + 1000)
			].filter(Boolean)),
			headers: {
				[HEADER_SYNC_VERSION]: currSyncVer
			}
		})


	#patch(api, body) {
		return fetch(this.#addr + api, {
			method: 'PATCH',
			body: JSON.stringify(body)
		})
	}

	reset = () => this.#patch(API.reset)

	selectCookie = label => this.#patch(API.cookies, label)
	setGlobalDelay = delay => this.#patch(API.globalDelay, delay)
	setCorsAllowed = value => this.#patch(API.cors, value)
	setProxyFallback = proxyAddr => this.#patch(API.fallback, proxyAddr)
	setCollectProxied = shouldCollect => this.#patch(API.collectProxied, shouldCollect)

	select = file => this.#patch(API.select, file)
	bulkSelectByComment = comment => this.#patch(API.bulkSelect, comment)

	toggle500 = (method, urlMask) => this.#patch(API.toggle500, [method, urlMask])
	setRouteIsProxied = (method, urlMask, proxied) => this.#patch(API.proxied, [method, urlMask, proxied])
	setRouteIsDelayed = (method, urlMask, delayed) => this.#patch(API.delay, [method, urlMask, delayed])

	setStaticRouteStatus = (urlMask, status) => this.#patch(API.staticStatus, [urlMask, status])
	setStaticRouteIsDelayed = (urlMask, delayed) => this.#patch(API.delayStatic, [urlMask, delayed])
}
