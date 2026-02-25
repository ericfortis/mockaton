import { Commander } from './ApiCommander.js'
import { parseFilename, extractComments } from './Filename.js'


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

	getSyncVersion: api.getSyncVersion,

	_action(action, onSuccess) {
		Promise.try(async () => {
			const response = await action()
			if (!response.ok) throw response
			return response
		})
			.then(onSuccess)
			.catch(store.onError)
	},

	async fetchState() {
		store._action(api.getState, async response => {
			const data = await response.json()
			const isFirstCall = store.showProxyField === null
			if (isFirstCall) {
				store.showProxyField = Boolean(data.proxyFallback)
			}
			Object.assign(store, data)
			store.render()
		})
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

	async reset() {
		store._action(api.reset, () => {
			store.setChosenLink('', '')
			store.fetchState()
		})
	},

	async bulkSelectByComment(value) {
		store._action(() => api.bulkSelectByComment(value),
			store.fetchState)
	},

	async setGlobalDelay(value) {
		store._action(() => api.setGlobalDelay(value), () => {
			store.delay = value
		})
	},

	async setGlobalDelayJitter(value) {
		store._action(() => api.setGlobalDelayJitter(value), () => {
			store.delayJitter = value
		})
	},

	async selectCookie(name) {
		store._action(() => api.selectCookie(name), async response => {
			store.cookies = await response.json()
		})
	},

	async setProxyFallback(value) {
		store.showProxyField = true
		store._action(() => api.setProxyFallback(value), () => {
			store.proxyFallback = value
			store.render()
		})
	},

	async setCollectProxied(checked) {
		store._action(() => api.setCollectProxied(checked), () => {
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

	async selectFile(file) {
		store._action(() => api.select(file), async response => {
			const { method, urlMask } = parseFilename(file)
			store.setBroker(await response.json())
			store.setChosenLink(method, urlMask)
			store.renderRow(method, urlMask)
		})
	},

	async toggle500(method, urlMask) {
		store._action(() => api.toggle500(method, urlMask), async response => {
			store.setBroker(await response.json())
			store.setChosenLink(method, urlMask)
			store.renderRow(method, urlMask)
		})
	},

	async setProxied(method, urlMask, checked) {
		store._action(() => api.setRouteIsProxied(method, urlMask, checked), async response => {
			store.setBroker(await response.json())
			store.setChosenLink(method, urlMask)
			store.renderRow(method, urlMask)
		})
	},

	async setDelayed(method, urlMask, checked) {
		store._action(() => api.setRouteIsDelayed(method, urlMask, checked), async response => {
			store.setBroker(await response.json())
		})
	},

	async setDelayedStatic(route, checked) {
		store._action(() => api.setStaticRouteIsDelayed(route, checked), () => {
			store.staticBrokers[route].delayed = checked
		})
	},

	async setStaticRouteStatus(route, status) {
		store._action(() => api.setStaticRouteStatus(route, status), () => {
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
	const result = [['', paths[0]]]
	const pathsInParts = paths.map(p => p.split('/').filter(Boolean))

	for (let i = 1; i < paths.length; i++) {
		const prev = pathsInParts[i - 1]
		const curr = pathsInParts[i]

		const min = Math.min(curr.length, prev.length)
		let j = 0
		while (j < min && curr[j] === prev[j])
			j++

		if (!j) // no common dirs
			result.push(['', paths[i]])
		else {
			const ditto = '/' + curr.slice(0, j).join('/') + '/'
			result.push([ditto, paths[i].slice(ditto.length)])
		}
	}
	return result
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
	get proxied() { return this.#canProxy && this.#broker.proxied }
	get selectedFile() { return this.#broker.file }
	get selectedIdx() {
		return this.opts.findIndex(([, , selected]) => selected)
	}
	get selectedFileIs4xx() {
		return this.status >= 400 && this.status < 500
	}

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
			ext === 'empty' || ext === 'unknown' ? '' : ext,
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
