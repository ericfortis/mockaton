import { parseFilename } from '/Filename.js'
import { Commander } from '/Commander.js'
import { DEFAULT_500_COMMENT } from '/ApiConstants.js'


const Strings = {
	allow_cors: 'Allow CORS',
	bulk_select_by_comment: 'Bulk Select by Comment',
	click_link_to_preview: 'Click a link to preview it',
	cookie: 'Cookie',
	delay: 'Delay',
	empty_response_body: '/* Empty Response Body */',
	internal_server_error: 'Internal Server Error',
	mock: 'Mock',
	reset: 'Reset',
	select_one: 'Select One',
	title: 'Mockaton'
}

const CSS = {
	CorsCheckbox: 'CorsCheckbox',
	DelayToggler: 'DelayToggler',
	InternalServerErrorToggler: 'InternalServerErrorToggler',
	MockSelector: 'MockSelector',
	PayloadViewer: 'PayloadViewer',
	PreviewLink: 'PreviewLink',
	ProgressBar: 'ProgressBar',

	bold: 'bold',
	chosen: 'chosen',
	status4xx: 'status4xx'
}

const r = createElement
const refPayloadViewer = useRef()
const refPayloadFile = useRef()

const mockaton = new Commander(window.location.origin)

function init() {
	Promise.all([
		mockaton.listMocks(),
		mockaton.listCookies(),
		mockaton.listComments(),
		mockaton.getCorsAllowed()
	].map(api => api.then(response => response.ok && response.json())))
		.then(App)
		.catch(console.error)
}
init()

function App([brokersByMethod, cookies, comments, corsAllowed]) {
	empty(document.body)
	createRoot(document.body).render(
		DevPanel(brokersByMethod, cookies, comments, corsAllowed))
}

function DevPanel(brokersByMethod, cookies, comments, corsAllowed) {
	document.title = Strings.title
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
					r('h2', { ref: refPayloadFile }, Strings.mock),
					r('pre', null,
						r('code', { ref: refPayloadViewer }, Strings.click_link_to_preview))))))
}

function CookieSelector({ list }) {
	return (
		r('label', null,
			r('span', null, Strings.cookie),
			r('select', {
				autocomplete: 'off',
				disabled: list.length <= 1,
				onChange() {
					mockaton.selectCookie(this.value)
						.catch(console.error)
				}
			}, list.map(([key, selected]) =>
				r('option', {
					value: key,
					selected
				}, key)))))
}

function BulkSelector({ comments }) {
	return (
		r('label', null,
			r('span', null, Strings.bulk_select_by_comment),
			r('select', {
				autocomplete: 'off',
				disabled: comments.length <= 1,
				onChange() {
					mockaton.bulkSelectByComment(this.value)
						.then(init)
						.catch(console.error)
				}
			}, [Strings.select_one].concat(comments).map(item =>
				r('option', {
					value: item
				}, item)))))
}

function CorsCheckbox({ corsAllowed }) {
	return (
		r('label', { className: CSS.CorsCheckbox },
			r('input', {
				type: 'checkbox',
				checked: corsAllowed,
				onChange(event) {
					mockaton.setCorsAllowed(event.currentTarget.checked)
						.catch(console.error)
				}
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
						r('td', null, r(InternalServerErrorToggler, { broker }))
					))))
}

function PreviewLink({ method, urlMask }) {
	return (
		r('a', {
			className: CSS.PreviewLink,
			href: urlMask,
			'data-method': method,
			async onClick(event) {
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
					updatePayloadViewer(
						await res.text() || Strings.empty_response_body,
						res.headers.get('content-type'))
					refPayloadFile.current.innerText = this.closest('tr').querySelector('select').value
				}
				catch (error) {
					console.error(error)
				}
			}
		}, urlMask))
}

function ProgressBar() {
	return (
		r('div', { className: CSS.ProgressBar },
			r('div', { style: { animationDuration: '1000ms' } }))) // TODO from Config.delay - 180
}

function updatePayloadViewer(body, mime) {
	if (mime === 'application/json' && window?.Prism.languages)
		refPayloadViewer.current.innerHTML = window.Prism.highlight(body, window.Prism.languages.json, 'json')
	else
		refPayloadViewer.current.innerText = body
}


function MockSelector({ broker }) {
	const className = (defaultIsSelected, status) => cssClass(
		CSS.MockSelector,
		!defaultIsSelected && CSS.bold,
		status >= 400 && status < 500 && CSS.status4xx)

	const items = broker.mocks
	const selected = broker.currentMock.file

	const { status } = parseFilename(selected)
	const files = items.filter(item =>
		status === 500 ||
		!item.includes(DEFAULT_500_COMMENT))

	return (
		r('select', {
			className: className(selected === files[0], status),
			autocomplete: 'off',
			disabled: files.length <= 1,
			onChange() {
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
		}, files.map(file => r('option', {
			value: file,
			selected: file === selected
		}, file))))
}

function DelayRouteToggler({ broker }) {
	const name = broker.currentMock.file
	const checked = Boolean(broker.currentMock.delay)
	return (
		r('label', {
				className: CSS.DelayToggler,
				title: Strings.delay
			},
			r('input', {
				type: 'checkbox',
				autocomplete: 'off',
				name,
				checked,
				onChange(event) {
					const { method, urlMask } = parseFilename(this.name)
					mockaton.setRouteIsDelayed(method, urlMask, event.currentTarget.checked)
						.catch(console.error)
				}
			}),
			TimerIcon()))
}

function TimerIcon() {
	return (
		r('svg', { viewBox: '0 0 24 24' },
			r('path', { d: 'M12 7H11v6l5 3.2.75-1.23-4.5-3z' })))
}

function InternalServerErrorToggler({ broker }) {
	const items = broker.mocks
	const name = broker.currentMock.file
	const checked = parseFilename(broker.currentMock.file).status === 500
	return (
		r('label', {
				className: CSS.InternalServerErrorToggler,
				title: Strings.internal_server_error
			},
			r('input', {
				type: 'checkbox',
				autocomplete: 'off',
				name,
				checked,
				onChange(event) {
					mockaton.select(event.currentTarget.checked
						? items.find(f => parseFilename(f).status === 500)
						: items[0])
						.then(init)
						.catch(console.error)
				}
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
