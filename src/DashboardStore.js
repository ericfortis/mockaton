import { deferred } from './DashboardDom.js'
import { Commander } from './ApiCommander.js'
import { parseFilename, extractComments } from './Filename.js'
import { AUTO_500_COMMENT } from './ApiConstants.js'


const t = translation => translation[0]
const mockaton = new Commander(location.origin)

export const store = {
	onError(err) {},
	render() {},
	renderRow(method, urlMask) {},

	brokersByMethod: /** @type {State.brokersByMethod} */ {},
	staticBrokers: /** @type {State.staticBrokers} */ {},

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


	leftSideWidth: undefined,

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
			store.cookies = await response.json()
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

	_dittoCache: new Map(),

	brokersAsRowsByMethod(method) {
		const rows = store._brokersAsArray(method)
			.map(b => new BrokerRowModel(b, store.canProxy))
			.sort((a, b) => a.urlMask.localeCompare(b.urlMask))
		const urlMasksDittoed = dittoSplitPaths(rows.map(r => r.urlMask))
		rows.forEach((r, i) => {
			store._dittoCache.set(r.method + '::' + r.urlMask, urlMasksDittoed[i])
			r.setUrlMaskDittoed(urlMasksDittoed[i])
		})
		return rows
	},

	brokerAsRow(method, urlMask) {
		const r = new BrokerRowModel(store.brokerFor(method, urlMask), store.canProxy)
		r.setUrlMaskDittoed(store._dittoCache.get(r.method + '::' + r.urlMask))
		return r
	},

	_brokersAsArray(byMethod = '*') {
		const arr = []
		for (const [method, brokers] of Object.entries(store.brokersByMethod))
			if (byMethod === '*' || byMethod === method)
				for (const broker of Object.values(brokers))
					arr.push(broker)
		return arr
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



export class BrokerRowModel {
	opts = /** @type {[key:string, label:string, selected:boolean][]} */ []
	method = ''
	urlMask = ''
	urlMaskDittoed = ['', '']
	#broker = /** @type {ClientMockBroker} */ {}
	#canProxy = false

	/**
	 * @param {ClientMockBroker} broker
	 * @param {boolean} canProxy
	 */
	constructor(broker, canProxy) {
		this.#broker = broker
		this.#canProxy = canProxy
		const { method, urlMask } = parseFilename(broker.currentMock.file)
		this.method = method
		this.urlMask = urlMask
		this.opts = this.#makeOptions()
	}

	setUrlMaskDittoed(urlMaskDittoed) {
		this.urlMaskDittoed = urlMaskDittoed
	}

	get delayed() {
		return this.#broker.currentMock.delayed
	}
	get proxied() {
		return this.#canProxy && this.#broker.currentMock.proxied
	}
	get selectedIdx() {
		return this.opts.findIndex(([, , selected]) => selected)
	}
	get selectedFile() {
		return this.#broker.currentMock.file
	}
	get selectedFileIs4xx() {
		const { status } = parseFilename(this.selectedFile)
		return status >= 400 && status < 500
	}
	get selectedFileIs500() {
		const { status } = parseFilename(this.selectedFile)
		return status === 500
	}

	#makeOptions() {
		const proxied = this.proxied
		const selectedIs500 = this.selectedFileIs500

		const opts = this.#broker.mocks
			.filter(f => selectedIs500 || !f.includes(AUTO_500_COMMENT))
			.map(f => [
				f,
				this.#optionLabelFor(f),
				!proxied && f === this.selectedFile
			])

		if (proxied)
			opts.push([
				'__PROXIED__',
				t`Proxied`,
				true
			])

		return opts
	}

	#optionLabelFor(file) {
		const { status, ext } = parseFilename(file)
		const comments = extractComments(file)
		const isAutogen500 = comments.includes(AUTO_500_COMMENT)
		return [
			isAutogen500 ? '' : status,
			ext === 'empty' || ext === 'unknown' ? '' : ext,
			isAutogen500 ? t`Auto500` : comments.join(' ')
		].filter(Boolean).join(' ')
	}
}

const TestBrokerRowModelOptions = {
	'ignores autogen500 when unselected'() {
		const broker = {
			currentMock: { file: 'api/other' },
			mocks: [`api/user${AUTO_500_COMMENT}.GET.500.empty`]
		}
		const row = new BrokerRowModel(broker, false)
		console.assert(row.opts.length === 0)
	},

	'keeps non-autogen500 when unselected'() {
		const broker = {
			currentMock: { file: 'api/other' },
			mocks: [`api/user.GET.500.txt`]
		}
		const row = new BrokerRowModel(broker, false)
		console.assert(row.opts.length === 1)
		console.assert(row.opts[0][1] === t`500 txt`)
	},

	'renames autogen file to Auto500'() {
		const broker = {
			currentMock: { file: `api/user${AUTO_500_COMMENT}.GET.500.empty` },
			mocks: [`api/user${AUTO_500_COMMENT}.GET.500.empty`]
		}
		const row = new BrokerRowModel(broker, false)
		console.assert(row.opts.length === 1)
		console.assert(row.opts[0][1] === t`Auto500`)
	},

	'filename has extension except when empty or unknown'() {
		const broker = {
			currentMock: { file: `api/other` },
			mocks: [
				`api/user0.GET.200.empty`,
				`api/user1.GET.200.unknown`,
				`api/user2.GET.200.json`,
				`api/user3(another json).GET.200.json`,
			]
		}
		const row = new BrokerRowModel(broker, false)
		// Think about, in cases like this, the only option the user has
		// for discerning empty and unknown is on the Previewer Title
		console.assert(deepEqual(row.opts.map(([, n]) => n), [
			'200',
			'200',
			'200 json',
			'200 json (another json)',
		]))
	},

	'appends "Proxied" label iff current is proxied'() {
		const broker = {
			currentMock: {
				file: 'api/foo',
				proxied: true
			},
			mocks: [`api/foo.GET.200.json`]
		}
		const row = new BrokerRowModel(broker, true)
		console.assert(deepEqual(row.opts.map(([, n, selected]) => [n, selected]), [
			['200 json', false],
			[t`Proxied`, true]
		]))
	}
}
deferred(() => Object.values(TestBrokerRowModelOptions).forEach(t => t()))

function deepEqual(a, b) {
	return JSON.stringify(a) === JSON.stringify(b)
}

