import { Commander } from './ApiCommander.js'
import { dittoSplitPaths, groupByFolder } from './dir-tree.js'
import { parseFilename, extractComments } from './Filename.js'
import { QueryParamBool, LocalStorageSet } from './dom-utils.js'
import { EXT_UNKNOWN_MIME, EXT_EMPTY } from './ApiConstants.js'


export const t = translation => translation[0]
const api = new Commander(globalThis.location?.origin)

export const store = {
	onError(err) {},
	render() {},
	renderRow(method, urlMask) {},
	skipNextRender: false,

	brokersByMethod: /** @type ClientBrokersByMethod */ {},

	cookies: [],
	comments: [],
	delay: 0,
	delayJitter: 0,

	collectProxied: false,
	proxyFallback: '',
	showProxyField: null,
	get canProxy() { return Boolean(store.proxyFallback) },

	_groupByMethod: new QueryParamBool('groupByMethod'),
	get groupByMethod() { return store._groupByMethod.value },
	toggleGroupByMethod() {
		store._groupByMethod.toggle()
		store.render()
	},

	collapsedFolders: new LocalStorageSet('collapsedFolders'),
	setFolderCollapsed(folder, collapsed) {
		if (collapsed)
			store.collapsedFolders.add(folder)
		else
			store.collapsedFolders.delete(folder)
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

			if (store.skipNextRender)
				store.skipNextRender = false
			else
				store.render()
		})
	},

	reset() {
		store._request(api.reset, () => {
			store.setChosenLink('', '')
		})
	},

	bulkSelectByComment(value) {
		store._request(() => api.bulkSelectByComment(value))
	},

	setGlobalDelay(value) {
		store.skipNextRender = true
		store._request(() => api.setGlobalDelay(value), () => {
			store.delay = value
		})
	},

	setGlobalDelayJitter(value) {
		store.skipNextRender = true
		store._request(() => api.setGlobalDelayJitter(value), () => {
			store.delayJitter = value
		})
	},

	selectCookie(name) {
		store.skipNextRender = true
		store._request(() => api.selectCookie(name), async response => {
			store.cookies = await response.json()
		})
	},

	setProxyFallback(value) {
		store._request(() => api.setProxyFallback(value), () => {
			store.proxyFallback = value
		})
	},

	setCollectProxied(checked) {
		store.skipNextRender = true
		store._request(() => api.setCollectProxied(checked), () => {
			store.collectProxied = checked
		})
	},


	_dittoCache: new Map(),

	brokerAsRow(method, urlMask) {
		const b = store.brokerFor(method, urlMask)
		const r = new BrokerRowModel(b, store.canProxy)
		r.setUrlMaskDittoed(store._dittoCache.get(r.key))
		return r
	},

	brokerFor(method, urlMask) {
		return store.brokersByMethod[method]?.[urlMask]
	},

	folderGroupsByMethod(method) {
		return groupByFolder(store._brokersAsRowsByMethod(method))
	},

	_brokersAsRowsByMethod(method) {
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

	_brokersAsArray(byMethod = '*') {
		const arr = []
		for (const [method, brokers] of Object.entries(store.brokersByMethod))
			if (byMethod === '*' || byMethod === method)
				arr.push(...Object.values(brokers))
		return arr
	},


	previewLink(method, urlMask) {
		store.setChosenLink(method, urlMask)
		store.renderRow(method, urlMask)
	},

	selectFile(file) {
		store.skipNextRender = true
		store._request(() => api.select(file), async response => {
			const { method, urlMask } = parseFilename(file)
			store._setBroker(await response.json())
			store.setChosenLink(method, urlMask)
			store.renderRow(method, urlMask)
		})
	},

	toggleStatus(method, urlMask, status) {
		store.skipNextRender = true
		store._request(() => api.toggleStatus(method, urlMask, status), async response => {
			store._setBroker(await response.json())
			store.setChosenLink(method, urlMask)
			store.renderRow(method, urlMask)
		})
	},

	setProxied(method, urlMask, checked) {
		store.skipNextRender = true
		store._request(() => api.setRouteIsProxied(method, urlMask, checked), async response => {
			store._setBroker(await response.json())
			store.setChosenLink(method, urlMask)
			store.renderRow(method, urlMask)
		})
	},

	setDelayed(method, urlMask, checked) {
		store.skipNextRender = true
		store._request(() => api.setRouteIsDelayed(method, urlMask, checked), async response => {
			store._setBroker(await response.json())
		})
	},

	_setBroker(broker) {
		const { method, urlMask } = parseFilename(broker.file)
		store.brokersByMethod[method] ??= {}
		store.brokersByMethod[method][urlMask] = broker
	}
}

// When false, the URL will be updated with param=false
function initPreference(param) {
	const qs = new URLSearchParams(globalThis.location?.search)
	if (!qs.has(param)) {
		const group = globalThis.localStorage?.getItem(param) !== '0'
		if (!group) {
			const url = new URL(globalThis.location?.href)
			url.searchParams.set(param, '0')
			history.replaceState(null, '', url)
		}
		return group
	}
	return qs.get(param) !== '0'
}

// When false, the URL and localStorage will have param='0'
function togglePreference(param, nextVal) {
	if (nextVal)
		globalThis.localStorage?.removeItem(param)
	else
		globalThis.localStorage?.setItem(param, nextVal)

	const url = new URL(location.href)
	if (nextVal)
		url.searchParams.delete(param)
	else
		url.searchParams.set(param, '0')
	history.replaceState(null, '', url)
}



export class BrokerRowModel {
	opts = /** @type {[key:string, label:string, selected:boolean][]} */ []
	isNew = false
	key = ''
	method = ''
	urlMask = ''
	urlMaskDittoed = ['', '']
	children = []
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
	get autoStatus() { return this.#broker.autoStatus }
	get isStatic() { return this.#broker.isStatic }
	get delayed() { return this.#broker.delayed }
	get proxied() { return this.#broker.proxied && this.#canProxy }
	get selectedFile() { return this.#broker.file }
	get selectedIdx() { return this.opts.findIndex(([, , selected]) => selected) }
	get selectedFileIs4xx() { return this.status >= 400 && this.status < 500 }

	#makeOptions() {
		const opts = this.#broker.mocks.map(f => [
			f,
			this.#optionLabelFor(f),
			!this.autoStatus && !this.proxied && f === this.selectedFile
		])

		if (this.autoStatus)
			opts.push([
				'__AUTO_STATUS__',
				this.autoStatus === 404 ? t`Auto404` : t`Auto500`,
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
