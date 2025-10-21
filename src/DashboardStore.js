import { deferred } from './DashboardDom.js'
import { Commander } from './ApiCommander.js'
import { parseFilename } from './Filename.js'


const mockaton = new Commander(location.origin)

export const store = {
	onError(err) {},
	render() {},
	renderRow(method, urlMask) {},

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

	async fetchState() {
		try {
			const response = await mockaton.getState()
			if (!response.ok) throw response
			Object.assign(store, await response.json())
			store.render()
		}
		catch (error) { store.onError(error) }
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

	async reset() {
		try {
			const response = await mockaton.reset()
			if (!response.ok) throw response
			store.setChosenLink('', '')
			await store.fetchState()
		}
		catch (error) { store.onError(error) }
	},

	async bulkSelectByComment(value) {
		try {
			const response = await mockaton.bulkSelectByComment(value)
			if (!response.ok) throw response
			await store.fetchState()
		}
		catch (error) { store.onError(error) }
	},

	async setGlobalDelay(value) {
		try {
			const response = await mockaton.setGlobalDelay(value)
			if (!response.ok) throw response
			store.delay = value
		}
		catch (error) { store.onError(error) }
	},

	async selectCookie(name) {
		try {
			const response = await mockaton.selectCookie(name)
			if (!response.ok) throw response
			store.cookies = store.cookies.map(([n]) => [n, n === name])
		}
		catch (error) { store.onError(error) }
	},

	async setProxyFallback(value) {
		try {
			const response = await mockaton.setProxyFallback(value)
			if (!response.ok) throw response
			store.proxyFallback = value
			store.render()
		}
		catch (error) { store.onError(error) }
	},

	async setCollectProxied(checked) {
		try {
			const response = await mockaton.setCollectProxied(checked)
			if (!response.ok) throw response
			store.collectProxied = checked
		}
		catch (error) { store.onError(error) }
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

	async selectFile(file) {
		try {
			const response = await mockaton.select(file)
			if (!response.ok) throw response
			const { method, urlMask } = parseFilename(file)
			store.brokerFor(method, urlMask).currentMock = await response.json()
			store.setChosenLink(method, urlMask)
			store.renderRow(method, urlMask)
		}
		catch (error) { store.onError(error) }
	},

	async toggle500(method, urlMask) {
		try {
			const response = await mockaton.toggle500(method, urlMask)
			if (!response.ok) throw response
			store.brokerFor(method, urlMask).currentMock = await response.json()
			store.setChosenLink(method, urlMask)
			store.renderRow(method, urlMask)
		}
		catch (error) { store.onError(error) }
	},

	async setProxied(method, urlMask, checked) {
		try {
			const response = await mockaton.setRouteIsProxied(method, urlMask, checked)
			if (!response.ok) throw response
			store.brokerFor(method, urlMask).currentMock.proxied = checked
			store.setChosenLink(method, urlMask)
			store.renderRow(method, urlMask)
		}
		catch (error) { store.onError(error) }
	},

	async setDelayed(method, urlMask, checked) {
		try {
			const response = await mockaton.setRouteIsDelayed(method, urlMask, checked)
			if (!response.ok) throw response
			store.brokerFor(method, urlMask).currentMock.delayed = checked
		}
		catch (error) { store.onError(error) }
	},


	async setDelayedStatic(route, checked) {
		try {
			const response = await mockaton.setStaticRouteIsDelayed(route, checked)
			if (!response.ok) throw response
			store.staticBrokers[route].delayed = checked
		}
		catch (error) { store.onError(error) }
	},

	async setStaticRouteStatus(route, status) {
		try {
			const response = await mockaton.setStaticRouteStatus(route, status)
			if (!response.ok) throw response
			store.staticBrokers[route].status = status
		}
		catch (error) { store.onError(error) }
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
dittoSplitPaths.test = function () {
	const input = [
		'/api/user',
		'/api/user/avatar',
		'/api/user/friends',
		'/api/vid',
		'/api/video/id',
		'/api/video/stats',
		'/v2/foo',
		'/v2/foo/bar'
	]
	const expected = [
		['', '/api/user'],
		['/api/user/', 'avatar'],
		['/api/user/', 'friends'],
		['/api/', 'vid'],
		['/api/', 'video/id'],
		['/api/video/', 'stats'],
		['', '/v2/foo'],
		['/v2/foo/', 'bar']
	]
	console.assert(deepEqual(dittoSplitPaths(input), expected))
}
deferred(dittoSplitPaths.test)

function deepEqual(a, b) {
	return JSON.stringify(a) === JSON.stringify(b)
}

