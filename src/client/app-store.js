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
	get canProxy() {
		return Boolean(store.proxyFallback)
	},

	getSyncVersion: api.getSyncVersion,

	async fetchState() {
		try {
			const response = await api.getState()
			if (!response.ok) throw response
			Object.assign(store, await response.json())
			store.render()
		}
		catch (error) { store.onError(error) }
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
		try {
			const response = await api.reset()
			if (!response.ok) throw response
			store.setChosenLink('', '')
			await store.fetchState()
		}
		catch (error) { store.onError(error) }
	},

	async bulkSelectByComment(value) {
		try {
			const response = await api.bulkSelectByComment(value)
			if (!response.ok) throw response
			await store.fetchState()
		}
		catch (error) { store.onError(error) }
	},


	async setGlobalDelay(value) {
		try {
			const response = await api.setGlobalDelay(value)
			if (!response.ok) throw response
			store.delay = value
		}
		catch (error) { store.onError(error) }
	},

	async setGlobalDelayJitter(value) {
		try {
			const response = await api.setGlobalDelayJitter(value)
			if (!response.ok) throw response
			store.delayJitter = value
		}
		catch (error) { store.onError(error) }
	},

	async selectCookie(name) {
		try {
			const response = await api.selectCookie(name)
			if (!response.ok) throw response
			store.cookies = await response.json()
		}
		catch (error) { store.onError(error) }
	},

	async setProxyFallback(value) {
		try {
			const response = await api.setProxyFallback(value)
			if (!response.ok) throw response
			store.proxyFallback = value
			store.render()
		}
		catch (error) { store.onError(error) }
	},

	async setCollectProxied(checked) {
		try {
			const response = await api.setCollectProxied(checked)
			if (!response.ok) throw response
			store.collectProxied = checked
		}
		catch (error) { store.onError(error) }
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
		try {
			const response = await api.select(file)
			if (!response.ok) throw response
			const { method, urlMask } = parseFilename(file)
			store.setBroker(await response.json())
			store.setChosenLink(method, urlMask)
			store.renderRow(method, urlMask)
		}
		catch (error) { store.onError(error) }
	},

	async toggle500(method, urlMask) {
		try {
			const response = await api.toggle500(method, urlMask)
			if (!response.ok) throw response
			store.setBroker(await response.json())
			store.renderRow(method, urlMask)
		}
		catch (error) { store.onError(error) }
	},

	async setProxied(method, urlMask, checked) {
		try {
			const response = await api.setRouteIsProxied(method, urlMask, checked)
			if (!response.ok) throw response
			store.setBroker(await response.json())
			store.renderRow(method, urlMask)
		}
		catch (error) { store.onError(error) }
	},

	async setDelayed(method, urlMask, checked) {
		try {
			const response = await api.setRouteIsDelayed(method, urlMask, checked)
			if (!response.ok) throw response
			store.setBroker(await response.json())
		}
		catch (error) { store.onError(error) }
	},


	async setDelayedStatic(route, checked) {
		try {
			const response = await api.setStaticRouteIsDelayed(route, checked)
			if (!response.ok) throw response
			store.staticBrokers[route].delayed = checked
		}
		catch (error) { store.onError(error) }
	},

	async setStaticRouteStatus(route, status) {
		try {
			const response = await api.setStaticRouteStatus(route, status)
			if (!response.ok) throw response
			store.staticBrokers[route].status = status
		}
		catch (error) { store.onError(error) }
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
		const prevParts = pathsInParts[i - 1]
		const currParts = pathsInParts[i]

		let j = 0
		while (
			j < currParts.length &&
			j < prevParts.length &&
			currParts[j] === prevParts[j])
			j++

		if (!j) // no common dirs
			result.push(['', paths[i]])
		else {
			const ditto = '/' + currParts.slice(0, j).join('/') + '/'
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
