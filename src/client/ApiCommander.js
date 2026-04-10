import { API } from './ApiConstants.js'


/** Client for controlling Mockaton via its HTTP API */
export class Commander {
	addr = ''

	constructor(addr) {
		this.addr = addr
	}

	/** @returns {Promise<Response>} */
	#patch = (api, body) => fetch(this.addr + api, {
		method: 'PATCH',
		body: JSON.stringify(body)
	})

	reset = () => this.#patch(API.reset)

	setGlobalDelay = delay => this.#patch(API.globalDelay, delay)

	setGlobalDelayJitter = jitterPct => this.#patch(API.globalDelayJitter, jitterPct)

	setCorsAllowed = value => this.#patch(API.cors, value)

	setWatchMocks = enabled => this.#patch(API.watchMocks, enabled)

	setProxyFallback = proxyAddr => this.#patch(API.fallback, proxyAddr)

	setCollectProxied = shouldCollect => this.#patch(API.collectProxied, shouldCollect)

	/** @returns {JsonPromise<State.cookies>} */
	selectCookie = label => this.#patch(API.cookies, label)


	bulkSelectByComment = comment => this.#patch(API.bulkSelect, comment)

	/** @returns {JsonPromise<ClientMockBroker>} */
	select = file => this.#patch(API.select, file)


	/** @returns {JsonPromise<ClientMockBroker>} */
	toggleStatus = (status, method, urlMask) => this.#patch(API.toggleStatus, [status, method, urlMask])

	// TODO change Status or Toggle404?

	/** @returns {JsonPromise<ClientMockBroker>} */
	setRouteIsProxied = (method, urlMask, proxied) => this.#patch(API.proxied, [method, urlMask, proxied])

	/** @returns {JsonPromise<ClientMockBroker>} */
	setRouteIsDelayed = (method, urlMask, delayed) => this.#patch(API.delay, [method, urlMask, delayed])


	/** @returns {JsonPromise<State>} */
	getState = () => fetch(this.addr + API.state)


	/**
	 * SSE - Streams an incremental version when a mock is added, deleted, or renamed
	 * @returns {Promise<Response>}
	 */
	getSyncVersion = () => fetch(this.addr + API.syncVersion)
}
