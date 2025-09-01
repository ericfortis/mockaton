import { DEFAULT_500_COMMENT, HEADER_FOR_502 } from './ApiConstants.js'
import { parseFilename } from './Filename.js'
import { Commander } from './Commander.js'


function syntaxHighlightJson(textBody) {
	const prism = window.Prism
	return prism?.highlight && prism?.languages?.json
		? prism.highlight(textBody, prism.languages.json, 'json')
		: false
}

const Strings = {
	bulk_select: 'Bulk Select',
	bulk_select_disabled_title: 'No mock files have comments, which are anything within parentheses on the filename.',
	click_link_to_preview: 'Click a link to preview it',
	cookie: 'Cookie',
	cookie_disabled_title: 'No cookies specified in config.cookies',
	delay: 'Delay',
	delay_ms: 'Delay (ms)',
	empty_response_body: '/* Empty Response Body */',
	fallback_server: 'Fallback Backend',
	fallback_server_error: '⛔ Fallback Backend Error',
	fallback_server_placeholder: 'Type Server Address',
	fetching: 'Fetching…',
	got: 'Got',
	internal_server_error: 'Internal Server Error',
	no_mocks_found: 'No mocks found',
	not_found: 'Not Found',
	pick_comment: 'Pick Comment…',
	preview: 'Preview',
	proxied: 'Proxied',
	proxy_toggler: 'Proxy Toggler',
	reset: 'Reset',
	save_proxied: 'Save Mocks',
	static_get: 'Static Folder GET',
	title: 'Mockaton'
}

const CSS = {
	BulkSelector: null,
	DelayToggler: null,
	ErrorToast: null,
	FallbackBackend: null,
	Field: null,
	GlobalDelayField: null,
	Help: null,
	InternalServerErrorToggler: null,
	MockList: null,
	MockSelector: null,
	NotFoundToggler: null,
	PayloadViewer: null,
	PreviewLink: null,
	ProgressBar: null,
	ProxyToggler: null,
	ResetButton: null,
	SaveProxiedCheckbox: null,
	StaticFilesList: null,

	chosen: null,
	dittoDir: null,
	empty: null,
	leftSide: null,
	nonDefault: null,
	red: null,
	rightSide: null,
	status4xx: null
}
for (const k of Object.keys(CSS))
	CSS[k] = k


const state = {
	/** @type {ClientBrokersByMethod} */
	brokersByMethod: {},

	/** @type {ClientStaticBrokers} */
	staticBrokers: {},

	/** @type {[label:string, selected:boolean][]} */
	cookies: [],

	/** @type {string[]} */
	comments: [],

	delay: 0,

	collectProxied: false,

	fallbackAddress: '',

	get canProxy() {
		return Boolean(this.fallbackAddress)
	}
}

const mockaton = new Commander(window.location.origin)
updateState()
initLongPoll()
function updateState() {
	Promise.all([
		mockaton.listMocks(),
		mockaton.listStaticFiles(),
		mockaton.listCookies(),
		mockaton.listComments(),
		mockaton.getGlobalDelay(),
		mockaton.getCollectProxied(),
		mockaton.getProxyFallback()
	].map(api => api.then(response => response.ok && response.json())))
		.then(data => {
			state.brokersByMethod = data[0]
			state.staticBrokers = data[1]
			state.cookies = data[2]
			state.comments = data[3]
			state.delay = data[4]
			state.collectProxied = data[5]
			state.fallbackAddress = data[6]
			document.body.replaceChildren(...App())
		})
		.catch(onError)
}

const r = createElement
const s = createSvgElement

function App() {
	return [
		r(Header),
		r('main', null,
			r('div', { className: CSS.leftSide },
				r(MockList),
				r(StaticFilesList)),
			r('div', { className: CSS.rightSide },
				r(PayloadViewer)))
	]
}


function Header() {
	return (
		r('header', null,
			r('img', {
				alt: Strings.title,
				src: 'mockaton/logo.svg',
				width: 160
			}),
			r('div', null,
				r(CookieSelector),
				r(BulkSelector),
				r(GlobalDelayField),
				r(ProxyFallbackField),
				r(ResetButton)),
			r('a', {
				className: CSS.Help,
				href: 'https://github.com/ericfortis/mockaton',
				target: '_blank',
				rel: 'noopener noreferrer'
			}, r(HelpIcon))))
}


function CookieSelector() {
	const { cookies } = state
	function onChange() {
		mockaton.selectCookie(this.value).catch(onError)
	}
	const disabled = cookies.length <= 1
	return (
		r('label', { className: CSS.Field },
			r('span', null, Strings.cookie),
			r('select', {
				autocomplete: 'off',
				disabled,
				title: disabled ? Strings.cookie_disabled_title : '',
				onChange
			}, cookies.map(([value, selected]) =>
				r('option', { value, selected }, value)))))
}


function BulkSelector() {
	const { comments } = state
	// UX wise this should be a menu instead of this `select`.
	// But this way is easier to implement, with a few hacks.
	const firstOption = Strings.pick_comment
	function onChange() {
		const value = this.value
		this.value = firstOption // Hack 
		mockaton.bulkSelectByComment(value)
			.then(updateState)
			.catch(onError)
	}
	const disabled = !comments.length
	const list = disabled
		? []
		: [firstOption].concat(comments)
	return (
		r('label', { className: CSS.Field },
			r('span', null, Strings.bulk_select),
			r('select', {
				className: CSS.BulkSelector,
				'data-qaid': 'BulkSelector',
				autocomplete: 'off',
				disabled,
				title: disabled ? Strings.bulk_select_disabled_title : '',
				onChange
			}, list.map(value =>
				r('option', { value }, value)))))
}


function GlobalDelayField() {
	const { delay } = state
	function onChange() {
		state.delay = this.valueAsNumber
		mockaton.setGlobalDelay(state.delay).catch(onError)
	}
	return (
		r('label', { className: cssClass(CSS.Field, CSS.GlobalDelayField) },
			r('span', null, r(TimerIcon), Strings.delay_ms),
			r('input', {
				type: 'number',
				min: 0,
				step: 100,
				autocomplete: 'none',
				value: delay,
				onChange
			})))
}


function ProxyFallbackField() {
	const { fallbackAddress, collectProxied } = state
	function onChange() {
		const saveCheckbox = this.closest(`.${CSS.FallbackBackend}`).querySelector('[type=checkbox]')
		saveCheckbox.disabled = !this.validity.valid || !this.value.trim()

		if (!this.validity.valid)
			this.reportValidity()
		else
			mockaton.setProxyFallback(this.value.trim())
				.then(updateState)
				.catch(onError)
	}
	return (
		r('div', { className: cssClass(CSS.Field, CSS.FallbackBackend) },
			r('label', null,
				r('span', null, r(CloudIcon), Strings.fallback_server),
				r('input', {
					type: 'url',
					autocomplete: 'none',
					placeholder: Strings.fallback_server_placeholder,
					value: fallbackAddress,
					onChange
				})),
			r(SaveProxiedCheckbox, {
				collectProxied,
				disabled: !fallbackAddress
			})))
}

function SaveProxiedCheckbox({ disabled }) {
	const { collectProxied } = state
	function onChange() {
		mockaton.setCollectProxied(this.checked).catch(onError)
	}
	return (
		r('label', { className: CSS.SaveProxiedCheckbox },
			r('input', {
				type: 'checkbox',
				disabled,
				checked: collectProxied,
				onChange
			}),
			r('span', null, Strings.save_proxied)))
}


function ResetButton() {
	function onClick() {
		mockaton.reset().then(updateState).catch(onError)
	}
	return (
		r('button', {
			className: CSS.ResetButton,
			onClick
		}, Strings.reset))
}



/** # MockList */

function MockList() {
	const { brokersByMethod } = state
	const hasMocks = Object.keys(brokersByMethod).length
	if (!hasMocks)
		return (
			r('div', { className: CSS.empty },
				Strings.no_mocks_found))
	return (
		r('div', null,
			r('table', null, Object.entries(brokersByMethod).map(([method, brokers]) =>
				r(SectionByMethod, { method, brokers })))))
}

function SectionByMethod({ method, brokers }) {
	const canProxy = state.canProxy
	const brokersSorted = Object.entries(brokers)
		.filter(([, broker]) => broker.mocks.length > 1) // >1 because of autogen500
		.sort((a, b) => a[0].localeCompare(b[0]))

	const urlMasks = brokersSorted.map(([urlMask]) => urlMask)
	const urlMasksDittoed = dittoSplitPaths(urlMasks)
	return (
		r('tbody', null,
			r('tr', null,
				r('th', { colspan: 2 + Number(canProxy) }),
				r('th', null, method)),
			brokersSorted.map(([urlMask, broker], i) =>
				r('tr', { 'data-method': method, 'data-urlMask': urlMask },
					canProxy && r('td', null, r(ProxyToggler, { broker })),
					r('td', null, r(DelayRouteToggler, { broker })),
					r('td', null, r(InternalServerErrorToggler, { broker })),
					r('td', null, r(PreviewLink, { method, urlMask, urlMaskDittoed: urlMasksDittoed[i] })),
					r('td', null, r(MockSelector, { broker }))
				))))
}

function PreviewLink({ method, urlMask, urlMaskDittoed }) {
	async function onClick(event) {
		event.preventDefault()
		try {
			document.querySelector(`.${CSS.PreviewLink}.${CSS.chosen}`)?.classList.remove(CSS.chosen)
			this.classList.add(CSS.chosen)
			await previewMock(method, urlMask, this.href)
		}
		catch (error) {
			onError(error)
		}
	}
	const [ditto, tail] = urlMaskDittoed
	return (
		r('a', {
			className: CSS.PreviewLink,
			href: urlMask,
			onClick
		}, ditto
			? [r('span', { className: CSS.dittoDir }, ditto), tail]
			: tail))
}

/** @param {{ broker: ClientMockBroker }} props */
function MockSelector({ broker }) {
	function onChange() {
		const { urlMask, method } = parseFilename(this.value)
		mockaton.select(this.value)
			.then(updateState)
			.then(() => linkFor(method, urlMask)?.click())
			.catch(onError)
	}

	let selected = broker.currentMock.file
	const { status, urlMask } = parseFilename(selected)
	const files = broker.mocks.filter(item =>
		status === 500 ||
		!item.includes(DEFAULT_500_COMMENT))
	if (!selected) {
		selected = Strings.proxied
		files.push(selected)
	}

	return (
		r('select', {
			onChange,
			autocomplete: 'off',
			'data-qaid': urlMask,
			disabled: files.length <= 1,
			className: cssClass(
				CSS.MockSelector,
				selected !== files[0] && CSS.nonDefault,
				status >= 400 && status < 500 && CSS.status4xx)
		}, files.map(file =>
			r('option', {
				value: file,
				selected: file === selected
			}, file))))
}

/** @param {{ broker: ClientMockBroker }} props */
function DelayRouteToggler({ broker }) {
	function onChange() {
		const { method, urlMask } = parseFilename(broker.mocks[0])
		mockaton.setRouteIsDelayed(method, urlMask, this.checked).catch(onError)
	}
	return (
		r('label', {
				className: CSS.DelayToggler,
				title: Strings.delay
			},
			r('input', {
				type: 'checkbox',
				checked: broker.currentMock.delayed,
				onChange
			}),
			TimerIcon()))
}

/** @param {{ broker: ClientMockBroker }} props */
function InternalServerErrorToggler({ broker }) {
	function onChange() {
		const { urlMask, method } = parseFilename(broker.mocks[0])
		mockaton.select(
			this.checked
				? broker.mocks.find(f => parseFilename(f).status === 500)
				: broker.mocks[0])
			.then(updateState)
			.then(() => linkFor(method, urlMask)?.click())
			.catch(onError)
	}
	return (
		r('label', {
				className: CSS.InternalServerErrorToggler,
				title: Strings.internal_server_error
			},
			r('input', {
				type: 'checkbox',
				name: broker.currentMock.file,
				checked: parseFilename(broker.currentMock.file).status === 500,
				onChange
			}),
			r('span', null, '500')))
}

/** @param {{ broker: ClientMockBroker }} props */
function ProxyToggler({ broker }) {
	function onChange() {
		const { urlMask, method } = parseFilename(broker.mocks[0])
		mockaton.setRouteIsProxied(method, urlMask, this.checked)
			.then(updateState)
			.then(() => linkFor(method, urlMask)?.click())
			.catch(onError)
	}
	return (
		r('label', {
				className: CSS.ProxyToggler,
				title: Strings.proxy_toggler
			},
			r('input', {
				type: 'checkbox',
				checked: !broker.currentMock.file,
				onChange
			}),
			r(CloudIcon)))
}



/** # StaticFilesList */

function StaticFilesList() {
	const { staticBrokers } = state
	const canProxy = state.canProxy
	if (!Object.keys(staticBrokers).length)
		return null
	const dp = dittoSplitPaths(Object.keys(staticBrokers)).map(([ditto, tail]) => ditto
		? [r('span', { className: CSS.dittoDir }, ditto), tail]
		: tail)
	return (
		r('table', { className: CSS.StaticFilesList },
			r('thead', null,
				r('tr', null,
					r('th', { colspan: 2 + Number(canProxy) }),
					r('th', null, Strings.static_get))),
			r('tbody', null,
				Object.values(staticBrokers).map((broker, i) =>
					r('tr', null,
						canProxy && r('td', null, r(ProxyStaticToggler, {})),
						r('td', null, r(DelayStaticRouteToggler, { broker })),
						r('td', null, r(NotFoundToggler, { broker })),
						r('td', null, r('a', { href: broker.route, target: '_blank' }, dp[i]))
					)))))
}

/** @param {{ broker: ClientStaticBroker }} props */
function DelayStaticRouteToggler({ broker }) {
	function onChange() {
		mockaton.setStaticRouteIsDelayed(broker.route, this.checked)
			.catch(onError)
	}
	return (
		r('label', {
				className: CSS.DelayToggler,
				title: Strings.delay
			},
			r('input', {
				type: 'checkbox',
				checked: broker.delayed,
				onChange
			}),
			TimerIcon()))
}

/** @param {{ broker: ClientStaticBroker }} props */
function NotFoundToggler({ broker }) {
	function onChange() {
		mockaton.setStaticRouteStatus(broker.route, this.checked ? 404 : 200)
			.catch(onError)
	}
	return (
		r('label', {
				className: CSS.NotFoundToggler,
				title: Strings.not_found
			},
			r('input', {
				type: 'checkbox',
				checked: broker.status === 404,
				onChange
			}),
			r('span', null, '404')))
}

function ProxyStaticToggler({}) { // TODO
	function onChange() {
	}
	return (
		r('label', {
				style: { visibility: 'hidden' },
				className: CSS.ProxyToggler,
				title: Strings.proxy_toggler
			},
			r('input', {
				type: 'checkbox',
				disabled: true,
				onChange
			}),
			r(CloudIcon)))
}



/** # Payload Preview */

const payloadViewerTitleRef = useRef()
const payloadViewerRef = useRef()

function PayloadViewer() {
	return (
		r('div', { className: CSS.PayloadViewer },
			r('h2', { ref: payloadViewerTitleRef }, Strings.preview),
			r('pre', null,
				r('code', { ref: payloadViewerRef }, Strings.click_link_to_preview))))
}

function PayloadViewerProgressBar() {
	return (
		r('div', { className: CSS.ProgressBar },
			r('div', { style: { animationDuration: state.delay + 'ms' } })))
}

function PayloadViewerTitle({ file, status, statusText }) {
	const { urlMask, method, ext } = parseFilename(file)
	return (
		r('span', null,
			urlMask + '.' + method + '.',
			r('abbr', { title: statusText }, status),
			'.' + ext))
}
function PayloadViewerTitleWhenProxied({ mime, status, statusText, gatewayIsBad }) {
	return (
		r('span', null,
			gatewayIsBad
				? r('span', { className: CSS.red }, Strings.fallback_server_error + ' ')
				: r('span', null, Strings.got + ' '),
			r('abbr', { title: statusText }, status),
			' ' + mime))
}

async function previewMock(method, urlMask, href) {
	previewMock.controller?.abort()
	previewMock.controller = new AbortController

	renderProgressBar()
	payloadViewerTitleRef.current.replaceChildren(r('span', null, Strings.fetching))

	try {
		const response = await fetch(href, {
			method,
			signal: previewMock.controller.signal
		})
		await updatePayloadViewer(method, urlMask, response)
	}
	catch {}

	function renderProgressBar() {
		payloadViewerRef.current.replaceChildren(PayloadViewerProgressBar())
	}
}

async function updatePayloadViewer(method, urlMask, response) {
	const mime = response.headers.get('content-type') || ''

	const file = mockSelectorFor(method, urlMask).value
	if (file === Strings.proxied)
		payloadViewerTitleRef.current.replaceChildren(PayloadViewerTitleWhenProxied({
			status: response.status,
			statusText: response.statusText,
			mime,
			gatewayIsBad: response.headers.get(HEADER_FOR_502)
		}))
	else
		payloadViewerTitleRef.current.replaceChildren(PayloadViewerTitle({
			status: response.status,
			statusText: response.statusText,
			file
		}))

	if (mime.startsWith('image/')) { // Naively assumes GET.200
		payloadViewerRef.current.replaceChildren(
			r('img', {
				src: URL.createObjectURL(await response.blob())
			}))
	}
	else {
		const body = await response.text() || Strings.empty_response_body
		if (mime === 'application/json') {
			const hBody = syntaxHighlightJson(body)
			if (hBody) {
				payloadViewerRef.current.innerHTML = hBody
				return
			}
		}
		payloadViewerRef.current.innerText = body
	}
}


function trFor(method, urlMask) {
	return document.querySelector(`tr[data-method="${method}"][data-urlMask="${urlMask}"]`)
}
function linkFor(method, urlMask) {
	return trFor(method, urlMask)?.querySelector(`a.${CSS.PreviewLink}`)
}
function mockSelectorFor(method, urlMask) {
	return trFor(method, urlMask)?.querySelector(`select.${CSS.MockSelector}`)
}


/** # Misc */

function onError(error) {
	if (error?.message === 'Failed to fetch')
		showErrorToast('Looks like the Mockaton server is not running')
	console.error(error)
}

function showErrorToast(msg) {
	document.getElementsByClassName(CSS.ErrorToast)[0]?.remove()
	document.body.appendChild(
		r('div', {
			className: CSS.ErrorToast,
			onClick() {
				const toast = this
				document.startViewTransition(() => toast.remove())
			}
		}, msg))
}

function TimerIcon() {
	return (
		s('svg', { viewBox: '0 0 24 24' },
			s('path', { d: 'm11 5.6 0.14 7.2 6 3.7' })))
}

function CloudIcon() {
	return (
		s('svg', { viewBox: '0 0 24 24' },
			s('path', { d: 'm6.1 8.9c0.98-2.3 3.3-3.9 6-3.9 3.3-2e-7 6 2.5 6.4 5.7 0.018 0.15 0.024 0.18 0.026 0.23 0.0016 0.037 8.2e-4 0.084 0.098 0.14 0.097 0.054 0.29 0.05 0.48 0.05 2.2 0 4 1.8 4 4s-1.8 4-4 4c-4-0.038-9-0.038-13-0.018-2.8 0-5-2.2-5-5-2.2e-7 -2.8 2.2-5 5-5 2.8 2e-7 5 2.2 5 5' }),
			s('path', { d: 'm6.1 9.1c2.8 0 5 2.3 5 5' })))
}

function HelpIcon() {
	return (
		s('svg', { viewBox: '0 0 24 24' },
			s('path', { d: 'M11 18h2v-2h-2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4' })))
}

/**
 * # Poll UI Sync Version
 * The version increments when a mock file is added or removed
 */

function initLongPoll() {
	poll.oldSyncVersion = 0
	poll.controller = new AbortController()
	poll()
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) {
			poll.controller.abort('_hidden_tab_')
			poll.controller = new AbortController()
		}
		else
			poll()
	})
}

async function poll() {
	try {
		const response = await mockaton.getSyncVersion(poll.oldSyncVersion, poll.controller.signal)
		if (response.ok) {
			const syncVersion = await response.json()
			if (poll.oldSyncVersion !== syncVersion) { // because it could be < or >
				poll.oldSyncVersion = syncVersion
				await updateState()
			}
			poll()
		}
		else
			throw response.status
	}
	catch (error) {
		if (error !== '_hidden_tab_')
			setTimeout(poll, 3000)
	}
}


/** # Utils */

function cssClass(...args) {
	return args.filter(Boolean).join(' ')
}


function createElement(elem, props = null, ...children) {
	if (typeof elem === 'function')
		return elem(props)

	const node = document.createElement(elem)
	if (props)
		for (const [key, value] of Object.entries(props))
			if (key === 'ref')
				value.current = node
			else if (key.startsWith('on'))
				node.addEventListener(key.replace(/^on/, '').toLowerCase(), value)
			else if (key === 'style')
				Object.assign(node.style, value)
			else if (key in node)
				node[key] = value
			else
				node.setAttribute(key, value)
	node.append(...children.flat().filter(Boolean))
	return node
}

function createSvgElement(tagName, props, ...children) {
	const elem = document.createElementNS('http://www.w3.org/2000/svg', tagName)
	for (const [key, value] of Object.entries(props))
		elem.setAttribute(key, value)
	elem.append(...children.flat().filter(Boolean))
	return elem
}

function useRef() {
	return { current: null }
}


/**
 * Think of this as a way of printing a directory tree in which
 * the repeated folder paths are kept but styled differently.
 * @param {string[]} paths - sorted
 */
function dittoSplitPaths(paths) {
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

(function testDittoSplitPaths() {
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
	console.assert(JSON.stringify(dittoSplitPaths(input)) === JSON.stringify(expected))
}())
