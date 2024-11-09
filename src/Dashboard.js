import { parseFilename } from '/Filename.js'
import { Commander } from '/Commander.js'
import { DEFAULT_500_COMMENT } from '/ApiConstants.js'


const Strings = {
	allow_cors: 'Allow CORS',
	bulk_select_by_comment: 'Bulk Select by Comment',
	bulk_select_by_comment_disabled_title: 'No mock files have comments, which are anything within parentheses on the filename.',
	click_link_to_preview: 'Click a link to preview it',
	cookie: 'Cookie',
	cookie_disabled_title: 'No cookies specified in Config.cookies',
	delay: 'Delay',
	empty_response_body: '/* Empty Response Body */',
	internal_server_error: 'Internal Server Error',
	mock: 'Mock',
	reset: 'Reset',
	select_one: 'Select One',
	static: 'Static'
}

const CSS = {
	CorsCheckbox: 'CorsCheckbox',
	DelayToggler: 'DelayToggler',
	InternalServerErrorToggler: 'InternalServerErrorToggler',
	MockSelector: 'MockSelector',
	PayloadViewer: 'PayloadViewer',
	PreviewLink: 'PreviewLink',
	ProgressBar: 'ProgressBar',
	StaticFilesList: 'StaticFilesList',

	bold: 'bold',
	chosen: 'chosen',
	status4xx: 'status4xx'
}

const r = createElement
const refPayloadViewer = useRef()
const refPayloadViewerFileTitle = useRef()

const mockaton = new Commander(window.location.origin)

function init() {
	Promise.all([
		mockaton.listMocks(),
		mockaton.listCookies(),
		mockaton.listComments(),
		mockaton.getCorsAllowed(),
		mockaton.listStaticFiles()
	].map(api => api.then(response => response.ok && response.json())))
		.then(App)
		.catch(console.error)
}
init()

function App(apiResponses) {
	empty(document.body)
	createRoot(document.body)
		.render(DevPanel(apiResponses))
}

function DevPanel([brokersByMethod, cookies, comments, corsAllowed, staticFiles]) {
	return (
		r('div', null,
			r('menu', null,
				r('img', { src: '/mockaton-logo.svg', width: 160, alt: Strings.title }),
				r(CookieSelector, { list: cookies }),
				r(BulkSelector, { comments }),
				r(CorsCheckbox, { corsAllowed }),
				r(ResetButton)),
			r('main', null,
				r('table', null, Object.entries(brokersByMethod).map(([method, brokers]) =>
					r(SectionByMethod, { method, brokers }))),
				r('div', { className: CSS.PayloadViewer },
					r('h2', { ref: refPayloadViewerFileTitle }, Strings.mock),
					r('pre', null,
						r('code', { ref: refPayloadViewer }, Strings.click_link_to_preview)))),
			r(StaticFilesList, { staticFiles })))
}


function CookieSelector({ list }) {
	function onChange() {
		mockaton.selectCookie(this.value)
			.catch(console.error)
	}
	const disabled = list.length <= 1
	return (
		r('label', null,
			r('span', null, Strings.cookie),
			r('select', {
					autocomplete: 'off',
					disabled,
					title: disabled ? Strings.cookie_disabled_title : '',
					onChange
				},
				list.map(([key, selected]) =>
					r('option', { value: key, selected }, key)))))
}


function BulkSelector({ comments }) {
	function onChange() {
		mockaton.bulkSelectByComment(this.value)
			.then(init)
			.catch(console.error)
	}
	const disabled = !comments.length
	const list = disabled
		? []
		: [Strings.select_one].concat(comments)
	return (
		r('label', null,
			r('span', null, Strings.bulk_select_by_comment),
			r('select', {
					autocomplete: 'off',
					disabled,
					title: disabled ? Strings.bulk_select_by_comment_disabled_title : '',
					onChange
				},
				list.map(value =>
					r('option', { value }, value)))))
}


function CorsCheckbox({ corsAllowed }) {
	function onChange(event) {
		mockaton.setCorsAllowed(event.currentTarget.checked)
			.catch(console.error)
	}
	return (
		r('label', { className: CSS.CorsCheckbox },
			r('input', {
				type: 'checkbox',
				checked: corsAllowed,
				onChange
			}),
			Strings.allow_cors))
}


function ResetButton() {
	return (
		r('button', {
			onClick() {
				mockaton.reset()
					.then(init)
					.catch(console.error)
			}
		}, Strings.reset)
	)
}


function StaticFilesList({ staticFiles }) {
	if (!staticFiles.length)
		return null
	return (
		r('details', {
				open: true,
				className: CSS.StaticFilesList
			},
			r('summary', null, Strings.static),
			r('ul', null,
				staticFiles.map(f =>
					r('li', null,
						r('a', {
							href: f,
							target: '_blank'
						}, f))))))
}


function SectionByMethod({ method, brokers }) {
	return (
		r('tbody', null,
			r('th', null, method),
			Object.entries(brokers)
				.filter(([, broker]) => broker.mocks.length > 1) // Excludes Markdown only routes (>1 because of the autogen500)
				.map(([urlMask, broker]) =>
					r('tr', null,
						r('td', null, r(PreviewLink, { method, urlMask })),
						r('td', null, r(MockSelector, { broker })),
						r('td', null, r(DelayRouteToggler, { broker })),
						r('td', null, r(InternalServerErrorToggler, { broker }))))))
}


function PreviewLink({ method, urlMask }) {
	async function onClick(event) {
		event.preventDefault()
		try {
			const spinner = setTimeout(() => {
				empty(refPayloadViewer.current)
				refPayloadViewer.current.append(ProgressBar())
			}, 180)
			const res = await fetch(this.href, {
				method: this.getAttribute('data-method')
			})
			document.querySelector(`.${CSS.PreviewLink}.${CSS.chosen}`)?.classList.remove(CSS.chosen)
			this.classList.add(CSS.chosen)
			clearTimeout(spinner)

			const mime = res.headers.get('content-type') || ''
			if (mime.startsWith('image/')) // naively assumes GET.200
				renderPayloadImage(this.href)
			else
				updatePayloadViewer(await res.text() || Strings.empty_response_body, mime)

			empty(refPayloadViewerFileTitle.current)
			refPayloadViewerFileTitle.current.append(PayloadViewerTitle({
				file: this.closest('tr').querySelector('select').value
			}))
		}
		catch (error) {
			console.error(error)
		}
	}
	return (
		r('a', {
			className: CSS.PreviewLink,
			href: urlMask,
			'data-method': method,
			onClick
		}, urlMask))
}


function PayloadViewerTitle({ file }) {
	const { urlMask, method, status, ext } = parseFilename(file)
	return (
		r('span', null,
			urlMask + '.' + method + '.',
			r('abbr', { title: HttpStatus[status] }, status),
			'.' + ext))
}


function ProgressBar() {
	return (
		r('div', { className: CSS.ProgressBar },
			r('div', { style: { animationDuration: '1000ms' } }))) // TODO from Config.delay - 180
}


function renderPayloadImage(href) {
	empty(refPayloadViewer.current)
	refPayloadViewer.current.append(r('img', { src: href }))
}

function updatePayloadViewer(body, mime) {
	if (mime === 'application/json' && window?.Prism.languages)
		refPayloadViewer.current.innerHTML = window.Prism.highlight(body, window.Prism.languages.json, 'json')
	else
		refPayloadViewer.current.innerText = body
}


function MockSelector({ broker }) {
	function onChange() {
		const { status } = parseFilename(this.value)
		this.style.fontWeight = this.value === this.options[0].value // default is selected
			? 'normal'
			: 'bold'
		mockaton.select(this.value)
			.then(() => {
				this.closest('tr').querySelector('a').click()
				this.closest('tr').querySelector(`.${CSS.InternalServerErrorToggler}>[type=checkbox]`).checked = status === 500
				this.className = className(this.value === this.options[0].value, status)
			})
			.catch(console.error)
	}


	function className(defaultIsSelected, status) {
		return cssClass(
			CSS.MockSelector,
			!defaultIsSelected && CSS.bold,
			status >= 400 && status < 500 && CSS.status4xx)
	}

	const selected = broker.currentMock.file
	const { status } = parseFilename(selected)
	const files = broker.mocks.filter(item =>
		status === 500 ||
		!item.includes(DEFAULT_500_COMMENT))

	return (
		r('select', {
				autocomplete: 'off',
				className: className(selected === files[0], status),
				disabled: files.length <= 1,
				onChange
			},
			files.map(file =>
				r('option', {
					value: file,
					selected: file === selected
				}, file))))
}


function DelayRouteToggler({ broker }) {
	function onChange(event) {
		const { method, urlMask } = parseFilename(this.name)
		mockaton.setRouteIsDelayed(method, urlMask, event.currentTarget.checked)
			.catch(console.error)
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
}


function TimerIcon() {
	return (
		r('svg', { viewBox: '0 0 24 24' },
			r('path', { d: 'M12 7H11v6l5 3.2.75-1.23-4.5-3z' })))
}


function InternalServerErrorToggler({ broker }) {
	function onChange(event) {
		mockaton.select(event.currentTarget.checked
			? broker.mocks.find(f => parseFilename(f).status === 500)
			: broker.mocks[0])
			.then(init)
			.catch(console.error)
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



/* === Utils === */
function cssClass(...args) {
	return args.filter(a => a).join(' ')
}

function empty(node) {
	while (node.firstChild)
		node.removeChild(node.firstChild)
}


// These are simplified React-compatible implementations.
// IOW, for switching to React, remove the `createRoot`, `createElement`, `useRef`

function createRoot(root) {
	return {
		render(app) {
			root.appendChild(app)
		}
	}
}

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
	node.append(...children.flat())
	return node
}

function createSvgElement(tagName, props, ...children) {
	const elem = document.createElementNS('http://www.w3.org/2000/svg', tagName)
	for (const [key, value] of Object.entries(props))
		elem.setAttribute(key, value)
	elem.append(...children.flat())
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
