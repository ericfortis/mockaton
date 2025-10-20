import { Commander } from './ApiCommander.js'
import { parseFilename } from './Filename.js'


const mockaton = new Commander(location.origin)

export const store = {
	setupPatchCallbacks(_then, _catch) {
		mockaton.setupPatchCallbacks(_then, _catch)
	},

	render() {},
	renderRow() {},

	/** @type {State.brokersByMethod} */
	brokersByMethod: {},

	/** @type {State.staticBrokers} */
	staticBrokers: {},

	cookies: [],
	comments: [],
	delay: 0,

	collectProxied: false,
	proxyFallback: '',
	get canProxy() {
		return Boolean(store.proxyFallback)
	},

	getSyncVersion: mockaton.getSyncVersion,

	fetchState() {
		return mockaton.getState().then(response => {
			if (!response.ok)
				throw response.status

			response.json().then(state => {
				Object.assign(store, state)
				store.render()
			})
		})
	},


	leftSideWidth: window.innerWidth / 2,

	groupByMethod: initPreference('groupByMethod'),
	toggleGroupByMethod() {
		store.groupByMethod = !store.groupByMethod
		togglePreference('groupByMethod', store.groupByMethod)
		store.render()
	},



	chosenLink: {
		method: '',
		urlMask: ''
	},
	get hasChosenLink() {
		return store.chosenLink.method
			&& store.chosenLink.urlMask
	},
	setChosenLink(method, urlMask) {
		store.chosenLink = { method, urlMask }
	},

	reset() {
		store.setChosenLink('', '')
		mockaton.reset()
			.then(store.fetchState)
	},

	bulkSelectByComment(value) {
		mockaton.bulkSelectByComment(value)
			.then(store.fetchState)
	},


	setGlobalDelay(value) {
		store.delay = value
		mockaton.setGlobalDelay(value)
	},

	selectCookie(name) {
		store.cookies = store.cookies.map(([n]) => [n, n === name])
		mockaton.selectCookie(name)
	},

	setProxyFallback(value) {
		store.proxyFallback = value
		mockaton.setProxyFallback(value)
			.then(store.render)
	},

	setCollectProxied(checked) {
		store.collectProxied = checked
		mockaton.setCollectProxied(checked)
	},


	brokerFor(method, urlMask) {
		return store.brokersByMethod[method]?.[urlMask]
	},

	brokersByMethodAsArray(targetMethod = '*') {
		const rows = []
		for (const [method, brokers] of Object.entries(store.brokersByMethod))
			if (targetMethod === '*' || targetMethod === method)
				for (const [urlMask, broker] of Object.entries(brokers))
					rows.push({ method, urlMask, broker })
		return rows.sort((a, b) => a.urlMask.localeCompare(b.urlMask))
	},

	previewLink(method, urlMask) {
		store.setChosenLink(method, urlMask)
		store.renderRow(method, urlMask)
	},

	selectFile(file) {
		mockaton.select(file).then(async response => {
			const { method, urlMask } = parseFilename(file)
			store.brokerFor(method, urlMask).currentMock = await response.json()
			store.setChosenLink(method, urlMask)
			store.renderRow(method, urlMask)
		})
	},

	toggle500(method, urlMask) {
		mockaton.toggle500(method, urlMask).then(async response => {
			store.brokerFor(method, urlMask).currentMock = await response.json()
			store.setChosenLink(method, urlMask)
			store.renderRow(method, urlMask)
		})
	},

	setProxied(method, urlMask, checked) {
		mockaton.setRouteIsProxied(method, urlMask, checked).then(() => {
			store.brokerFor(method, urlMask).currentMock.proxied = checked
			store.setChosenLink(method, urlMask)
			store.renderRow(method, urlMask)
		})
	},

	setDelayed(method, urlMask, checked) {
		mockaton.setRouteIsDelayed(method, urlMask, checked).then(() => {
			store.brokerFor(method, urlMask).currentMock.delayed = checked
		})
	},


	staticBrokerFor(route) { return store.staticBrokers[route] },

	setDelayedStatic(route, checked) {
		store.staticBrokerFor(route).delayed = checked
		mockaton.setStaticRouteIsDelayed(route, checked)
	},

	setStaticRouteStatus(route, status) {
		store.staticBrokerFor(route).status = status
		mockaton.setStaticRouteStatus(route, status)
	}
}


// When false, the URL will be updated with param=false
function initPreference(param) {
	const qs = new URLSearchParams(location.search)
	if (!qs.has(param)) {
		const group = localStorage.getItem(param) !== 'false'
		if (!group) {
			const url = new URL(location.href)
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
		localStorage.removeItem(param)
	else
		localStorage.setItem(param, nextVal)

	const url = new URL(location.href)
	if (nextVal)
		url.searchParams.delete(param)
	else
		url.searchParams.set(param, false)
	history.replaceState(null, '', url)
}
