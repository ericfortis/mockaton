import { parseFilename } from './Filename.js'
import { Commander } from './Commander.js'
import { DEFAULT_500_COMMENT } from './ApiConstants.js'


function syntaxHighlightJson(textBody) {
	const prism = window.Prism
	return prism?.highlight && prism?.languages?.json
		? prism.highlight(textBody, prism.languages.json, 'json')
		: false
}


const Strings = {
	bulk_select_by_comment: 'Bulk Select by Comment',
	bulk_select_by_comment_disabled_title: 'No mock files have comments, which are anything within parentheses on the filename.',
	click_link_to_preview: 'Click a link to preview it',
	cookie: 'Cookie',
	cookie_disabled_title: 'No cookies specified in Config.cookies',
	delay: 'Delay',
	empty_response_body: '/* Empty Response Body */',
	fallback_server: 'Fallback Backend',
	fallback_server_placeholder: 'Type Server Address',
	internal_server_error: 'Internal Server Error',
	mock: 'Mock',
	no_mocks_found: 'No mocks found',
	pick: 'Pick…',
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
	ResetButton: 'ResetButton',
	SaveProxiedCheckbox: 'SaveProxiedCheckbox',
	StaticFilesList: 'StaticFilesList',

	bold: 'bold',
	empty: 'empty',
	chosen: 'chosen',
	status4xx: 'status4xx'
}

const r = createElement

const mockaton = new Commander(window.location.origin)

function init() {
	return Promise.all([
		mockaton.listMocks(),
		mockaton.listCookies(),
		mockaton.listComments(),
		mockaton.getCollectProxied(),
		mockaton.getProxyFallback(),
		mockaton.listStaticFiles()
	].map(api => api.then(response => response.ok && response.json())))
		.then(data => document.body.replaceChildren(...App(data)))
		.catch(onError)
}
init()

function App([brokersByMethod, cookies, comments, collectProxied, fallbackAddress, staticFiles]) {
	return [
		r(Header, { cookies, comments, fallbackAddress, collectProxied }),
		r(MockList, { brokersByMethod }),
		r(StaticFilesList, { staticFiles })
	]
}


// Header ===============

function Header({ cookies, comments, fallbackAddress, collectProxied }) {
	return (
		r('menu', { className: CSS.Header },
			r(Logo),
			r(CookieSelector, { cookies }),
			r(BulkSelector, { comments }),
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
		mockaton.selectCookie(this.value)
			.catch(onError)
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
	const firstOption = Strings.pick
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
			r('span', null, Strings.bulk_select_by_comment),
			r('select', {
				className: CSS.BulkSelector,
				'data-qaid': 'BulkSelector',
				autocomplete: 'off',
				disabled,
				title: disabled ? Strings.bulk_select_by_comment_disabled_title : '',
				onChange
			}, list.map(value =>
				r('option', { value }, value)))))
}

function ProxyFallbackField({ fallbackAddress = '', collectProxied }) {
	function onChange() {
		const saveCheckbox = this.closest(`.${CSS.FallbackBackend}`).querySelector('[type=checkbox]')
		saveCheckbox.disabled = !this.validity.valid || !this.value.trim()

		if (!this.validity.valid)
			this.reportValidity()
		else
			mockaton.setProxyFallback(this.value.trim()).catch(onError)
	}
	return (
		r('div', { className: cssClass(CSS.Field, CSS.FallbackBackend) },
			r('label', null,
				r('span', null, Strings.fallback_server),
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

function MockList({ brokersByMethod }) {
	const hasMocks = Object.keys(brokersByMethod).length
	if (!hasMocks)
		return (
			r('main', { className: cssClass(CSS.MockList, CSS.empty) },
				Strings.no_mocks_found))
	return (
		r('main', { className: CSS.MockList },
			r('table', null, Object.entries(brokersByMethod).map(([method, brokers]) =>
				r(SectionByMethod, { method, brokers }))),
			r(PayloadViewer)))
}


function SectionByMethod({ method, brokers }) {
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
						r('td', null, r(DelayRouteToggler, { broker })),
						r('td', null, r(InternalServerErrorToggler, { broker }))))))
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
	function className(defaultIsSelected, status) {
		return cssClass(
			CSS.MockSelector,
			!defaultIsSelected && CSS.bold,
			status >= 400 && status < 500 && CSS.status4xx)
	}

	function onChange() {
		const { status, urlMask, method } = parseFilename(this.value)
		this.style.fontWeight = this.value === this.options[0].value // default is selected
			? 'normal'
			: 'bold'
		mockaton.select(this.value)
			.then(() => {
				linkFor(method, urlMask)?.click()
				checkbox500For(method, urlMask).checked = status === 500
				this.className = className(this.value === this.options[0].value, status)
			})
			.catch(onError)
	}

	const selected = broker.currentMock.file
	const { status, urlMask } = parseFilename(selected)
	const files = broker.mocks.filter(item =>
		status === 500 ||
		!item.includes(DEFAULT_500_COMMENT))

	return (
		r('select', {
			'data-qaid': urlMask,
			autocomplete: 'off',
			className: className(selected === files[0], status),
			disabled: files.length <= 1,
			onChange
		}, files.map(file =>
			r('option', {
				value: file,
				selected: file === selected
			}, file))))
}


function DelayRouteToggler({ broker }) {
	function onChange() {
		const { method, urlMask } = parseFilename(this.name)
		mockaton.setRouteIsDelayed(method, urlMask, this.checked)
			.catch(onError)
	}
	return (
		r('label', {
				className: CSS.DelayToggler,
				title: Strings.delay
			},
			r('input', {
				type: 'checkbox',
				name: broker.currentMock.file,
				checked: Boolean(broker.currentMock.delay),
				onChange
			}),
			TimerIcon()))

	function TimerIcon() {
		return (
			r('svg', { viewBox: '0 0 24 24' },
				r('path', { d: 'M12 7H11v6l5 3.2.75-1.23-4.5-3z' })))
	}
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
			r('span', null, '500')
		)
	)
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
			r('div', { style: { animationDuration: '1000ms' } }))) // TODO from Config.delay - 180
}

function PayloadViewerTitle({ file }) {
	const { urlMask, method, status, ext } = parseFilename(file)
	return (
		r('span', null,
			urlMask + '.' + method + '.',
			r('abbr', { title: HttpStatus[status] }, status),
			'.' + ext))
}

async function previewMock(method, urlMask, href) {
	const timer = setTimeout(renderProgressBar, 180)
	const response = await fetch(href, { method })
	clearTimeout(timer)
	await updatePayloadViewer(method, urlMask, response)

	function renderProgressBar() {
		payloadViewerRef.current.replaceChildren(PayloadViewerProgressBar())
	}
}

async function updatePayloadViewer(method, urlMask, response) {
	payloadViewerTitleRef.current.replaceChildren(
		PayloadViewerTitle({ file: mockSelectorFor(method, urlMask).value }))

	const mime = response.headers.get('content-type') || ''
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
function checkbox500For(method, urlMask) {
	return trFor(method, urlMask)?.querySelector(`.${CSS.InternalServerErrorToggler} > input`)
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



function onError(error) {
	if (error?.message === 'Failed to fetch')
		alert('Looks like the Mockaton server is not running')
	console.error(error)
}



// Utils ============

function cssClass(...args) {
	return args.filter(a => a).join(' ')
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
	node.append(...children.flat().filter(a => a))
	return node
}

function createSvgElement(tagName, props, ...children) {
	const elem = document.createElementNS('http://www.w3.org/2000/svg', tagName)
	for (const [key, value] of Object.entries(props))
		elem.setAttribute(key, value)
	elem.append(...children.flat().filter(a => a))
	return elem
}

function useRef() {
	return { current: null }
}

const HttpStatus = {
	100: 'Continue',
	101: 'Switching Protocols',
	102: 'Processing',
	103: 'Early Hints',
	200: 'OK',
	201: 'Created',
	202: 'Accepted',
	203: 'Non-Authoritative Information',
	204: 'No Content',
	205: 'Reset Content',
	206: 'Partial Content',
	207: 'Multi-Status',
	208: 'Already Reported',
	218: 'This is fine (Apache Web Server)',
	226: 'IM Used',
	300: 'Multiple Choices',
	301: 'Moved Permanently',
	302: 'Found',
	303: 'See Other',
	304: 'Not Modified',
	306: 'Switch Proxy',
	307: 'Temporary Redirect',
	308: 'Resume Incomplete',
	400: 'Bad Request',
	401: 'Unauthorized',
	402: 'Payment Required',
	403: 'Forbidden',
	404: 'Not Found',
	405: 'Method Not Allowed',
	406: 'Not Acceptable',
	407: 'Proxy Authentication Required',
	408: 'Request Timeout',
	409: 'Conflict',
	410: 'Gone',
	411: 'Length Required',
	412: 'Precondition Failed',
	413: 'Request Entity Too Large',
	414: 'Request-URI Too Long',
	415: 'Unsupported Media Type',
	416: 'Requested Range Not Satisfiable',
	417: 'Expectation Failed',
	418: 'I’m a teapot',
	419: 'Page Expired (Laravel Framework)',
	420: 'Method Failure (Spring Framework)',
	421: 'Misdirected Request',
	422: 'Unprocessable Entity',
	423: 'Locked',
	424: 'Failed Dependency',
	426: 'Upgrade Required',
	428: 'Precondition Required',
	429: 'Too Many Requests',
	431: 'Request Header Fields Too Large',
	440: 'Login Time-out',
	444: 'Connection Closed Without Response',
	449: 'Retry With',
	450: 'Blocked by Windows Parental Controls',
	451: 'Unavailable For Legal Reasons',
	494: 'Request Header Too Large',
	495: 'SSL Certificate Error',
	496: 'SSL Certificate Required',
	497: 'HTTP Request Sent to HTTPS Port',
	498: 'Invalid Token (Esri)',
	499: 'Client Closed Request',
	500: 'Internal Server Error',
	501: 'Not Implemented',
	502: 'Bad Gateway',
	503: 'Service Unavailable',
	504: 'Gateway Timeout',
	505: 'HTTP Version Not Supported',
	506: 'Variant Also Negotiates',
	507: 'Insufficient Storage',
	508: 'Loop Detected',
	509: 'Bandwidth Limit Exceeded',
	510: 'Not Extended',
	511: 'Network Authentication Required',
	520: 'Unknown Error',
	521: 'Web Server Is Down',
	522: 'Connection Timed Out',
	523: 'Origin Is Unreachable',
	524: 'A Timeout Occurred',
	525: 'SSL Handshake Failed',
	526: 'Invalid SSL Certificate',
	527: 'Railgun Listener to Origin Error',
	530: 'Origin DNS Error',
	598: 'Network Read Timeout Error'
}
