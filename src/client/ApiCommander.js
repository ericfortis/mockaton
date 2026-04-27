import { API } from './ApiConstants.js'


/** Client for controlling Mockaton via its HTTP API */
export class Commander {
	/** @param {string} addr */
	constructor(addr) {
		this.addr = addr
	}

	/** @returns {Promise<Response>} */
	#patch = (api, body = undefined) => fetch(this.addr + api, {
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
	toggleStatus = (method, urlMask, status) => this.#patch(API.toggleStatus, [method, urlMask, status])


	/** @returns {JsonPromise<ClientMockBroker>} */
	setRouteIsProxied = (method, urlMask, proxied) => this.#patch(API.proxied, [method, urlMask, proxied])

	/** @returns {JsonPromise<ClientMockBroker>} */
	setRouteIsDelayed = (method, urlMask, delayed) => this.#patch(API.delay, [method, urlMask, delayed])


	writeMock = (file, content) => this.#patch(API.writeMock, [file, content])
	deleteMock = file => this.#patch(API.deleteMock, file)


	/** @returns {JsonPromise<State>} */
	getState = () => fetch(this.addr + API.state)


	/**
	 * SSE - Streams an incremental version when a mock is added, deleted, or renamed.
	 *  Also, when the internal state changes.
	 * @returns {Promise<Response>}
	 */
	getSyncVersion = () => fetch(this.addr + API.syncVersion)

	getOpenAPI = () => fetch(this.addr + API.openAPI)
}
