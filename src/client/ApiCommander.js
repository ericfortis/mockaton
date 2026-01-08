import {
	API,
	HEADER_SYNC_VERSION,
	LONG_POLL_SERVER_TIMEOUT
} from './ApiConstants.js'


/** Client for controlling Mockaton via its HTTP API */
export class Commander {
	addr = ''

	constructor(addr) {
		this.addr = addr
	}

	#patch = (api, body) => fetch(this.addr + api, {
		method: 'PATCH',
		body: JSON.stringify(body)
	})

	/** @returns {Promise<Response>} */
	reset = () => this.#patch(API.reset)

	/** @returns {Promise<Response>} */
	setGlobalDelay = delay => this.#patch(API.globalDelay, delay)
	
	/** @returns {Promise<Response>} */
	setGlobalDelayJitter = jitterPct => this.#patch(API.globalDelayJitter, jitterPct)

	/** @returns {Promise<Response>} */
	setCorsAllowed = value => this.#patch(API.cors, value)

	/** @returns {Promise<Response>} */
	setProxyFallback = proxyAddr => this.#patch(API.fallback, proxyAddr)

	/** @returns {Promise<Response>} */
	setCollectProxied = shouldCollect => this.#patch(API.collectProxied, shouldCollect)

	/** @returns {JsonPromise<State.cookies>} */
	selectCookie = label => this.#patch(API.cookies, label)


	/** @returns {Promise<Response>} */
	bulkSelectByComment = comment => this.#patch(API.bulkSelect, comment)

	/** @returns {JsonPromise<ClientMockBroker>} */
	select = file => this.#patch(API.select, file)


	/** @returns {JsonPromise<ClientMockBroker>} */
	toggle500 = (method, urlMask) => this.#patch(API.toggle500, [method, urlMask])

	/** @returns {JsonPromise<ClientMockBroker>} */
	setRouteIsProxied = (method, urlMask, proxied) => this.#patch(API.proxied, [method, urlMask, proxied])

	/** @returns {JsonPromise<ClientMockBroker>} */
	setRouteIsDelayed = (method, urlMask, delayed) => this.#patch(API.delay, [method, urlMask, delayed])


	/** @returns {Promise<Response>} */
	setStaticRouteStatus = (urlMask, status) => this.#patch(API.staticStatus, [urlMask, status])

	/** @returns {Promise<Response>} */
	setStaticRouteIsDelayed = (urlMask, delayed) => this.#patch(API.delayStatic, [urlMask, delayed])



	/** @returns {JsonPromise<State>} */
	getState = () => fetch(this.addr + API.state)

	/**
	 * This is for listening to real-time updates. It responds when a new mock is added, deleted, or renamed.
	 * @param {number?} currSyncVer - On mismatch, it responds immediately. Otherwise, long polls.
	 * @param {AbortSignal} abortSignal
	 * @returns {JsonPromise<number>}
	 */
	getSyncVersion = (currSyncVer = undefined, abortSignal = undefined) =>
		fetch(this.addr + API.syncVersion, {
			signal: AbortSignal.any([
				abortSignal,
				AbortSignal.timeout(LONG_POLL_SERVER_TIMEOUT + 1000)
			].filter(Boolean)),
			headers: currSyncVer !== undefined
				? { [HEADER_SYNC_VERSION]: currSyncVer }
				: {}
		})
}
