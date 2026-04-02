import { Commander } from './ApiCommander.js'
import { parseFilename, extractComments } from './Filename.js'
import { EXT_UNKNOWN_MIME, EXT_EMPTY } from './ApiConstants.js'


export const t = translation => translation[0]
const api = new Commander(globalThis.location?.origin)

export const store = {
	onError(err) {},
	render() {},
	renderRow(method, urlMask) {},

	brokersByMethod: /** @type ClientBrokersByMethod */ {},
	staticBrokers: /** @type ClientStaticBrokers */ {},

	cookies: [],
	comments: [],
	delay: 0,
	delayJitter: 0,

	collectProxied: false,
	proxyFallback: '',
	showProxyField: null,
	get canProxy() {
		return Boolean(store.proxyFallback)
	},

	groupByMethod: initPreference('groupByMethod'),
	toggleGroupByMethod() {
		store.groupByMethod = !store.groupByMethod
		togglePreference('groupByMethod', store.groupByMethod)
		store.render()
	},

	chosenLink: { method: '', urlMask: '' },
	setChosenLink(method, urlMask) {
		store.chosenLink = { method, urlMask }
	},
	get hasChosenLink() {
		return store.chosenLink.method && store.chosenLink.urlMask
	},


	_request(action, onSuccess) {
		Promise.try(async () => {
			const response = await action()
			if (response.ok) return response
			throw response
		})
			.then(onSuccess)
			.catch(store.onError)
	},

	fetchState() {
		store._request(api.getState, async response => {
			Object.assign(store, await response.json())

			if (store.showProxyField === null) // isFirstCall
				store.showProxyField = Boolean(store.proxyFallback)

			store.render()
		})
	},

	reset() {
		store._request(api.reset, () => {
			store.setChosenLink('', '')
			store.fetchState()
		})
	},

	bulkSelectByComment(value) {
		store._request(() => api.bulkSelectByComment(value), () => {
			store.fetchState()
		})
	},

	setGlobalDelay(value) {
		store._request(() => api.setGlobalDelay(value), () => {
			store.delay = value
		})
	},

	setGlobalDelayJitter(value) {
		store._request(() => api.setGlobalDelayJitter(value), () => {
			store.delayJitter = value
		})
	},

	selectCookie(name) {
		store._request(() => api.selectCookie(name), async response => {
			store.cookies = await response.json()
		})
	},

	setProxyFallback(value) {
		store._request(() => api.setProxyFallback(value), () => {
			store.proxyFallback = value
			store.render()
		})
	},

	setCollectProxied(checked) {
		store._request(() => api.setCollectProxied(checked), () => {
			store.collectProxied = checked
		})
	},


	brokerFor(method, urlMask) {
		return store.brokersByMethod[method]?.[urlMask]
	},

	setBroker(broker) {
		const { method, urlMask } = parseFilename(broker.file)
		store.brokersByMethod[method] ??= {}
		store.brokersByMethod[method][urlMask] = broker
	},

	_dittoCache: new Map(),

	_brokersAsArray(byMethod = '*') {
		const arr = []
		for (const [method, brokers] of Object.entries(store.brokersByMethod))
			if (byMethod === '*' || byMethod === method)
				arr.push(...Object.values(brokers))
		return arr
	},

	brokersAsRowsByMethod(method) {
		const rows = store._brokersAsArray(method)
			.map(b => new BrokerRowModel(b, store.canProxy))
			.sort((a, b) => a.urlMask.localeCompare(b.urlMask))
		const urlMasksDittoed = dittoSplitPaths(rows.map(r => r.urlMask))
		rows.forEach((r, i) => {
			r.setUrlMaskDittoed(urlMasksDittoed[i])
			r.setIsNew(!store._dittoCache.has(r.key))
			store._dittoCache.set(r.key, urlMasksDittoed[i])
		})
		return rows
	},

	brokerAsRow(method, urlMask) {
		const b = store.brokerFor(method, urlMask)
		const r = new BrokerRowModel(b, store.canProxy)
		r.setUrlMaskDittoed(store._dittoCache.get(r.key))
		return r
	},

	staticBrokersAsRows() {
		const rows = Object.values(store.staticBrokers)
			.map(b => new StaticBrokerRowModel(b))
			.sort((a, b) => a.urlMask.localeCompare(b.urlMask))
		const urlMasksDittoed = dittoSplitPaths(rows.map(r => r.urlMask))
		rows.forEach((r, i) => {
			r.setUrlMaskDittoed(urlMasksDittoed[i])
			r.setIsNew(!store._dittoCache.has(r.key))
			store._dittoCache.set(r.key, urlMasksDittoed[i])
		})
		return rows
	},

	previewLink(method, urlMask) {
		store.setChosenLink(method, urlMask)
		store.renderRow(method, urlMask)
	},

	selectFile(file) {
		store._request(() => api.select(file), async response => {
			const { method, urlMask } = parseFilename(file)
			store.setBroker(await response.json())
			store.setChosenLink(method, urlMask)
			store.renderRow(method, urlMask)
		})
	},

	toggle500(method, urlMask) {
		store._request(() => api.toggle500(method, urlMask), async response => {
			store.setBroker(await response.json())
			store.setChosenLink(method, urlMask)
			store.renderRow(method, urlMask)
		})
	},

	setProxied(method, urlMask, checked) {
		store._request(() => api.setRouteIsProxied(method, urlMask, checked), async response => {
			store.setBroker(await response.json())
			store.setChosenLink(method, urlMask)
			store.renderRow(method, urlMask)
		})
	},

	setDelayed(method, urlMask, checked) {
		store._request(() => api.setRouteIsDelayed(method, urlMask, checked), async response => {
			store.setBroker(await response.json())
		})
	},

	setDelayedStatic(route, checked) {
		store._request(() => api.setStaticRouteIsDelayed(route, checked), () => {
			store.staticBrokers[route].delayed = checked
		})
	},

	setStaticRouteStatus(route, status) {
		store._request(() => api.setStaticRouteStatus(route, status), () => {
			store.staticBrokers[route].status = status
		})
	}
}



// When false, the URL will be updated with param=false
function initPreference(param) {
	const qs = new URLSearchParams(globalThis.location?.search)
	if (!qs.has(param)) {
		const group = globalThis.localStorage?.getItem(param) !== 'false'
		if (!group) {
			const url = new URL(globalThis.location?.href)
			url.searchParams.set(param, false)
			history.replaceState(null, '', url)
		}
		return group
	}
	return qs.get(param) !== 'false'
}

// When false, the URL and localStorage will have param=false
function togglePreference(param, nextVal) {
	if (nextVal)
		globalThis.localStorage?.removeItem(param)
	else
		globalThis.localStorage?.setItem(param, nextVal)

	const url = new URL(location.href)
	if (nextVal)
		url.searchParams.delete(param)
	else
		url.searchParams.set(param, false)
	history.replaceState(null, '', url)
}



/**
 * Think of this as a way of printing a directory tree in which
 * the repeated folder paths are kept but styled differently.
 * @param {string[]} paths - sorted
 */
export function dittoSplitPaths(paths) {
	const pParts = paths.map(p => p.split('/').filter(Boolean))
	return paths.map((p, i) => {
		if (i === 0)
			return ['', p]

		const prev = pParts[i - 1]
		const curr = pParts[i]
		const min = Math.min(curr.length, prev.length)
		let j = 0
		while (j < min && curr[j] === prev[j])
			j++

		if (!j) // no common dirs
			return ['', p]

		const ditto = '/' + curr.slice(0, j).join('/') + '/'
		return [ditto, p.slice(ditto.length)]
	})
}


export class BrokerRowModel {
	opts = /** @type {[key:string, label:string, selected:boolean][]} */ []
	isNew = false
	key = ''
	method = ''
	urlMask = ''
	urlMaskDittoed = ['', '']
	#broker = /** @type ClientMockBroker */ {}
	#canProxy = false

	/**
	 * @param {ClientMockBroker} broker
	 * @param {boolean} canProxy
	 */
	constructor(broker, canProxy) {
		this.#broker = broker
		this.#canProxy = canProxy
		const { method, urlMask } = parseFilename(broker.file)
		this.key = 'brm' + '::' + method + '::' + urlMask
		this.method = method
		this.urlMask = urlMask
		this.opts = this.#makeOptions()
	}

	setUrlMaskDittoed(urlMaskDittoed) {
		this.urlMaskDittoed = urlMaskDittoed
	}
	setIsNew(isNew) {
		this.isNew = isNew
	}

	get status() { return this.#broker.status }
	get auto500() { return this.#broker.auto500 }
	get delayed() { return this.#broker.delayed }
	get proxied() { return this.#broker.proxied && this.#canProxy }
	get selectedFile() { return this.#broker.file }
	get selectedIdx() { return this.opts.findIndex(([, , selected]) => selected) }
	get selectedFileIs4xx() { return this.status >= 400 && this.status < 500 }

	#makeOptions() {
		const opts = this.#broker.mocks.map(f => [
			f,
			this.#optionLabelFor(f),
			!this.auto500 && !this.proxied && f === this.selectedFile
		])

		if (this.auto500)
			opts.push([
				'__AUTO_500__',
				t`Auto500`,
				true
			])
		else if (this.proxied)
			opts.push([
				'__PROXIED__',
				t`Proxied`,
				true
			])

		return opts
	}

	#optionLabelFor(file) {
		const { status, ext } = parseFilename(file)
		return [
			status,
			ext === EXT_EMPTY || ext === EXT_UNKNOWN_MIME ? '' : ext,
			extractComments(file).join(' ')
		].filter(Boolean).join(' ')
	}
}


class StaticBrokerRowModel {
	isNew = false
	key = ''
	method = 'GET'
	urlMaskDittoed = ['', '']
	#broker = /** @type ClientStaticBroker */ {}

	/** @param {ClientStaticBroker} broker */
	constructor(broker) {
		this.#broker = broker
		this.key = 'sbrm' + '::' + this.method + '::' + broker.route
	}
	setUrlMaskDittoed(urlMaskDittoed) {
		this.urlMaskDittoed = urlMaskDittoed
	}
	setIsNew(isNew) {
		this.isNew = isNew
	}
	get urlMask() { return this.#broker.route }
	get delayed() { return this.#broker.delayed }
	get status() { return this.#broker.status }
}
