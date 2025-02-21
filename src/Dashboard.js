import { DEFAULT_500_COMMENT } from './ApiConstants.js'
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
	fallback_server_placeholder: 'Type Server Address',
	got: 'Got',
	internal_server_error: 'Internal Server Error',
	mock: 'Mock',
	no_mocks_found: 'No mocks found',
	pick_comment: 'Pick Comment…',
	proxied: 'Proxied',
	proxy_toggler: 'Proxy Toggler',
	reset: 'Reset',
	save_proxied: 'Save Mocks',
	static_get: 'Static GET'
}

const CSS = {
	BulkSelector: 'BulkSelector',
	DelayToggler: 'DelayToggler',
	FallbackBackend: 'FallbackBackend',
	Field: 'Field',
	Header: 'Header',
	InternalServerErrorToggler: 'InternalServerErrorToggler',
	MockList: 'MockList',
	MockSelector: 'MockSelector',
	PayloadViewer: 'PayloadViewer',
	PreviewLink: 'PreviewLink',
	ProgressBar: 'ProgressBar',
	ProxyToggler: 'ProxyToggler',
	ResetButton: 'ResetButton',
	GlobalDelayField: 'GlobalDelayField',
	SaveProxiedCheckbox: 'SaveProxiedCheckbox',
	StaticFilesList: 'StaticFilesList',

	empty: 'empty',
	chosen: 'chosen',
	status4xx: 'status4xx',
	nonDefault: 'nonDefault'
}

const r = createElement
const mockaton = new Commander(window.location.origin)

const PROGRESS_BAR_DELAY = 180
let globalDelay = 1200


init()
pollAR_Events() // Add or Remove Mocks from File System
document.addEventListener('visibilitychange', () => {
	if (!document.hidden)
		pollAR_Events()
})

function init() {
	return Promise.all([
		mockaton.listMocks(),
		mockaton.listCookies(),
		mockaton.listComments(),
		mockaton.getGlobalDelay(),
		mockaton.getCollectProxied(),
		mockaton.getProxyFallback(),
		mockaton.listStaticFiles()
	].map(api => api.then(response => response.ok && response.json())))
		.then(data => document.body.replaceChildren(App(data)))
		.catch(onError)
}

function App([brokersByMethod, cookies, comments, delay, collectProxied, fallbackAddress, staticFiles]) {
	globalDelay = delay
	return (
		r('div', null,
			r(Header, { cookies, comments, delay, fallbackAddress, collectProxied }),
			r(MockList, { brokersByMethod, canProxy: Boolean(fallbackAddress) }),
			r(StaticFilesList, { staticFiles })))
}

// Header ===============

function Header({ cookies, comments, delay, fallbackAddress, collectProxied }) {
	return (
		r('menu', { className: CSS.Header },
			r(Logo),
			r(CookieSelector, { cookies }),
			r(BulkSelector, { comments }),
			r(GlobalDelayField, { delay }),
			r(ProxyFallbackField, { fallbackAddress, collectProxied }),
			r(ResetButton)))
}

function Logo() {
	return (
		r('img', {
			alt: Strings.title,
			src: 'mockaton/mockaton-logo.svg',
			width: 160
		}))
}

function CookieSelector({ cookies }) {
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

function BulkSelector({ comments }) {
	// UX wise this should be a menu instead of this `select`.
	// But this way is easier to implement, with a few hacks.
	const firstOption = Strings.pick_comment
	function onChange() {
		const value = this.value
		this.value = firstOption // Hack 
		mockaton.bulkSelectByComment(value)
			.then(init)
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

function GlobalDelayField({ delay }) {
	function onChange() {
		globalDelay = this.valueAsNumber
		mockaton.setGlobalDelay(globalDelay).catch(onError)
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

function ProxyFallbackField({ fallbackAddress, collectProxied }) {
	function onChange() {
		const saveCheckbox = this.closest(`.${CSS.FallbackBackend}`).querySelector('[type=checkbox]')
		saveCheckbox.disabled = !this.validity.valid || !this.value.trim()

		if (!this.validity.valid)
			this.reportValidity()
		else
			mockaton.setProxyFallback(this.value.trim())
				.then(init)
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

function SaveProxiedCheckbox({ disabled, collectProxied }) {
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
	return (
		r('button', {
			className: CSS.ResetButton,
			onClick() {
				mockaton.reset()
					.then(init)
					.catch(onError)
			}
		}, Strings.reset))
}



// MockList ===============

function MockList({ brokersByMethod, canProxy }) {
	const hasMocks = Object.keys(brokersByMethod).length
	if (!hasMocks)
		return (
			r('main', { className: cssClass(CSS.MockList, CSS.empty) },
				Strings.no_mocks_found))
	return (
		r('main', { className: CSS.MockList },
			r('table', null, Object.entries(brokersByMethod).map(([method, brokers]) =>
				r(SectionByMethod, { method, brokers, canProxy }))),
			r(PayloadViewer)))
}


function SectionByMethod({ method, brokers, canProxy }) {
	return (
		r('tbody', null,
			r('th', null, method),
			Object.entries(brokers)
				.filter(([, broker]) => broker.mocks.length > 1) // >1 because of autogen500
				.sort((a, b) => a[0].localeCompare(b[0]))
				.map(([urlMask, broker]) =>
					r('tr', { 'data-method': method, 'data-urlMask': urlMask },
						r('td', null, r(PreviewLink, { method, urlMask })),
						r('td', null, r(MockSelector, { broker })),
						r('td', null, r(InternalServerErrorToggler, { broker })),
						r('td', null, r(DelayRouteToggler, { broker })),
						r('td', null, r(ProxyToggler, { broker, disabled: !canProxy }))))))
}


function PreviewLink({ method, urlMask }) {
	async function onClick(event) {
		event.preventDefault()
		try {
			await previewMock(method, urlMask, this.href)
			document.querySelector(`.${CSS.PreviewLink}.${CSS.chosen}`)?.classList.remove(CSS.chosen)
			this.classList.add(CSS.chosen)
		}
		catch (error) {
			onError(error)
		}
	}
	return (
		r('a', {
			className: CSS.PreviewLink,
			href: urlMask,
			onClick
		}, urlMask))
}


function MockSelector({ broker }) {
	function onChange() {
		const { urlMask, method } = parseFilename(this.value)
		mockaton.select(this.value)
			.then(init)
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


function InternalServerErrorToggler({ broker }) {
	function onChange() {
		const { urlMask, method } = parseFilename(broker.mocks[0])
		mockaton.select(
			this.checked
				? broker.mocks.find(f => parseFilename(f).status === 500)
				: broker.mocks[0])
			.then(init)
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


function ProxyToggler({ broker, disabled }) {
	function onChange() {
		const { urlMask, method } = parseFilename(broker.mocks[0])
		mockaton.setRouteIsProxied(method, urlMask, this.checked)
			.then(init)
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
				disabled,
				checked: !broker.currentMock.file,
				onChange
			}),
			r(CloudIcon)))
}



// Payload Preview ===============

const payloadViewerTitleRef = useRef()
const payloadViewerRef = useRef()

function PayloadViewer() {
	return (
		r('div', { className: CSS.PayloadViewer },
			r('h2', { ref: payloadViewerTitleRef }, Strings.mock),
			r('pre', null,
				r('code', { ref: payloadViewerRef }, Strings.click_link_to_preview))))
}

function PayloadViewerProgressBar() {
	return (
		r('div', { className: CSS.ProgressBar },
			r('div', { style: { animationDuration: globalDelay - PROGRESS_BAR_DELAY + 'ms' } })))
}

function PayloadViewerTitle({ file, status, statusText }) {
	const { urlMask, method, ext } = parseFilename(file)
	return (
		r('span', null,
			urlMask + '.' + method + '.',
			r('abbr', { title: statusText }, status),
			'.' + ext))
}
function PayloadViewerTitleWhenProxied({ mime, status, statusText }) {
	return (
		r('span', null,
			Strings.got + ' ',
			r('abbr', { title: statusText }, status),
			' ' + mime))
}

async function previewMock(method, urlMask, href) {
	const timer = setTimeout(renderProgressBar, PROGRESS_BAR_DELAY)
	const response = await fetch(href, { method })
	clearTimeout(timer)
	await updatePayloadViewer(method, urlMask, response)

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
			mime
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



// StaticFilesList ===============

function StaticFilesList({ staticFiles }) {
	if (!staticFiles.length)
		return null
	return (
		r('section', {
				open: true,
				className: CSS.StaticFilesList
			},
			r('h2', null, Strings.static_get),
			r('ul', null, staticFiles.map(f =>
				r('li', null,
					r('a', { href: f, target: '_blank' }, f))))))
}


// Misc ===============

function onError(error) {
	if (error?.message === 'Failed to fetch')
		alert('Looks like the Mockaton server is not running')
	console.error(error)
}

function TimerIcon() {
	return (
		r('svg', { viewBox: '0 0 24 24' },
			r('path', { d: 'M12 7H11v6l5 3.2.75-1.23-4.5-3z' })))
}

function CloudIcon() {
	return (
		r('svg', { viewBox: '0 0 24 24' },
			r('path', { d: 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.61 5.64 5.36 8.04 2.35 8.36 0 10.9 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96M19 18H6c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4h2c0-2.76-1.86-5.08-4.4-5.78C8.61 6.88 10.2 6 12 6c3.03 0 5.5 2.47 5.5 5.5v.5H19c1.65 0 3 1.35 3 3s-1.35 3-3 3' })))
}


// AR Events (Add or Remove mock) ============

pollAR_Events.isPolling = false
pollAR_Events.oldAR_EventsCount = 0
async function pollAR_Events() {
	if (pollAR_Events.isPolling || document.hidden)
		return
	try {
		pollAR_Events.isPolling = true
		const response = await mockaton.getAR_EventsCount(pollAR_Events.oldAR_EventsCount)
		if (response.ok) {
			const nAR_Events = await response.json()
			if (pollAR_Events.oldAR_EventsCount !== nAR_Events) { // because it could be < or >
				pollAR_Events.oldAR_EventsCount = nAR_Events
				await init()
			}
			pollAR_Events.isPolling = false
			pollAR_Events()
		}
		else
			throw response.status
	}
	catch (_) {
		pollAR_Events.isPolling = false
		setTimeout(pollAR_Events, 5000)
	}
}


// Utils ============

function cssClass(...args) {
	return args.filter(Boolean).join(' ')
}


// These are simplified React-compatible implementations.
// IOW, for switching to React, remove the `createRoot`, `createElement`, `useRef`

function createElement(elem, props = null, ...children) {
	if (typeof elem === 'function')
		return elem(props)

	if (['svg', 'path'].includes(elem)) // Incomplete list
		return createSvgElement(elem, props, children)

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
