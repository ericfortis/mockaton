import { Route } from '../Route.js'
import { DP, DF } from '../ApiConstants.js'


const Strings = {
	bulk_select_by_comment: 'Bulk Select by Comment',
	click_link_to_preview: 'Click a link to preview it',
	cookie: 'Cookie',
	delay: 'Delay',
	empty_response_body: '/* Empty Response Body */',
	fetching: '⌚ Fetching…',
	mock: 'Mock',
	none: 'None',
	reset: 'Reset',
	select_one: 'Select One',
	title: 'Mockaton',
	transforms: 'Transforms'
}

const CSS = {
	BulkSelectSection: 'BulkSelectSection',
	CookieSelector: 'CookieSelector',
	DelayCheckbox: 'DelayCheckbox',
	Documentation: 'Documentation',
	MockSelector: 'MockSelector',
	PayloadViewer: 'PayloadViewer',
	PreviewLink: 'PreviewLink',
	TitleWrap: 'TitleWrap',
	TransformSelector: 'TransformSelector',
	TransformsSection: 'TransformsSection',

	bold: 'bold',
	chosen: 'chosen',
	status4xx: 'status4xx',
	status5xx: 'status5xx'
}

const r = createElement
const refDocumentation = useRef()
const refPayloadViewer = useRef()
const refPayloadFile = useRef()

function init() {
	Promise.all([
		DP.mocks,
		DP.cookies,
		DP.comments
	].map(api => fetch(api).then(res => res.ok && res.json())))
		.then(App)
		.catch(console.error)
}
init()

function App([brokersByMethod, cookies, comments]) {
	empty(document.body)
	createRoot(document.body).render(
		DevPanel(brokersByMethod, cookies, comments))
}

function DevPanel(brokersByMethod, cookies, comments) {
	document.title = Strings.title
	return (
		r('div', null,
			r('div', { className: CSS.TitleWrap },
				r('h1', null, Strings.title),
				r(ResetButton),
				r(CookieSelector, { list: cookies })),
			r('div', { className: CSS.BulkSelectSection },
				r('h2', null, Strings.bulk_select_by_comment),
				r(BulkSelector, { comments })),
			r('main', null,
				r('table', null, Object.entries(brokersByMethod).map(([method, brokers]) =>
					r(SectionByMethod, { method, brokers }))),
				r('div', { className: CSS.PayloadViewer },
					r('pre', { ref: refDocumentation, className: CSS.Documentation }),
					r('h2', { ref: refPayloadFile }, Strings.mock),
					r('pre', { ref: refPayloadViewer }, Strings.click_link_to_preview))),
			r('div', { className: CSS.TransformsSection },
				r('h2', null, Strings.transforms),
				r(Transforms, { brokersByMethod }))))
}


function ResetButton() {
	return (
		r('button', {
			onClick() {
				fetch(DP.reset, { method: 'PATCH' })
					.then(init)
					.catch(console.error)
			}
		}, Strings.reset)
	)
}

function CookieSelector({ list }) {
	return (
		r('label', { className: CSS.CookieSelector },
			Strings.cookie,
			r('select', {
				autocomplete: 'off',
				disabled: list.length <= 1,
				onChange() {
					fetch(DP.cookies, {
						method: 'PATCH',
						body: JSON.stringify({ [DF.currentCookieKey]: this.value })
					})
						.then(init)
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
		r('select', {
			autocomplete: 'off',
			disabled: comments.length <= 1,
			onChange() {
				fetch(DP.bulkSelect, {
					method: 'PATCH',
					body: JSON.stringify({ [DF.comment]: this.value })
				})
					.then(init)
					.catch(console.error)
			}
		}, [Strings.select_one].concat(comments).map(item =>
			r('option', {
				value: item
			}, item))))
}


function SectionByMethod({ method, brokers }) {
	return (
		r('tbody', null,
			r('th', null, method),
			Object.entries(brokers)
				.sort((a, b) => a[0].localeCompare(b[0]))
				.filter(([, broker]) => broker.mocks.length) // handles Markdown doc or js transform without mocks
				.map(([urlMask, broker]) =>
					r('tr', null,
						r('td', null, r(PreviewLink, { method, urlMask, documentation: broker.documentation })),
						r('td', null, r(MockSelector, { items: broker.mocks, selected: broker.currentMock.file })),
						r('td', null, r(DelayToggler, { name: broker.currentMock.file, checked: Boolean(broker.currentMock.delay) }))))))
}

function PreviewLink({ method, urlMask, documentation }) {
	return (
		r('a', {
			className: CSS.PreviewLink,
			href: urlMask,
			'data-method': method,
			async onClick(event) {
				event.preventDefault()
				try {
					if (documentation) {
						const r = await fetch(documentation)
						refDocumentation.current.innerText = await r.text()
					}
					else
						refDocumentation.current.innerText = ''

					const spinner = setTimeout(() => refPayloadViewer.current.innerText = Strings.fetching, 180)
					const res = await fetch(this.href, {
						method: this.getAttribute('data-method'),
						headers: { [DF.isForDashboard]: '1' }
					})
					document.querySelector(`.${CSS.PreviewLink}.${CSS.chosen}`)?.classList.remove(CSS.chosen)
					this.classList.add(CSS.chosen)
					clearTimeout(spinner)
					refPayloadViewer.current.innerText = await res.text() || Strings.empty_response_body
					refPayloadFile.current.innerText = this.closest('tr').querySelector('select').value
				}
				catch (error) {
					console.error(error)
				}
			}
		}, urlMask))
}

function MockSelector({ items, selected }) {
	const className = (defaultIsSelected, status) => cssClass(
		CSS.MockSelector,
		!defaultIsSelected && CSS.bold,
		status >= 400 && status < 500 && CSS.status4xx,
		status >= 500 && CSS.status5xx)
	return (
		r('select', {
			className: className(selected === items[0], Route.parseFilename(selected).status),
			autocomplete: 'off',
			disabled: items.length <= 1,
			onChange() {
				const status = Route.parseFilename(this.value).status
				this.style.fontWeight = this.value === this.options[0].value // default is selected
					? 'normal'
					: 'bold'
				fetch(DP.edit, {
					method: 'PATCH',
					body: JSON.stringify({ [DF.file]: this.value })
				}).then(() => {
					this.closest('tr').querySelector('a').click()
					this.className = className(this.value === this.options[0].value, this.value === status)
				})
			}
		}, items.map(item =>
			r('option', {
				value: item,
				selected: item === selected
			}, item))))
}

function DelayToggler({ name, checked }) {
	return (
		r('label', {
				className: CSS.DelayCheckbox,
				title: Strings.delay
			},
			r('input', {
				type: 'checkbox',
				autocomplete: 'off',
				name,
				checked,
				onChange(event) {
					fetch(DP.edit, {
						method: 'PATCH',
						body: JSON.stringify({
							[DF.file]: this.name,
							[DF.delayed]: event.currentTarget.checked
						})
					})
				}
			}),
			TimerIcon()))
}

function TimerIcon() {
	return (
		r('svg', { viewBox: '0 0 24 24' },
			r('path', { d: 'M12 7H11v6l5 3.2.75-1.23-4.5-3z' })))
}


function Transforms({ brokersByMethod }) {
	const brokersWithTransforms = []
	for (const brokers of Object.values(brokersByMethod))
		for (const [urlMask, broker] of Object.entries(brokers))
			if (broker.transforms.length)
				brokersWithTransforms.push([urlMask, broker])
	return (
		r('table', null, brokersWithTransforms.map(([urlMask, broker]) =>
			r('tr', null,
				r('td', null, r(PreviewLink, { method: broker.method, urlMask })),
				r('td', null, r(TransformSelector, {
					items: ['', ...broker.transforms],
					selected: broker.currentTransform
				})))
		)))
}

function TransformSelector({ items, selected }) {
	const className = defaultIsSelected => cssClass(
		CSS.TransformSelector,
		!defaultIsSelected && CSS.bold)
	return (
		r('select', {
			className: className(selected === items[0]),
			autocomplete: 'off',
			onChange() {
				fetch(DP.transform, {
					method: 'PATCH',
					body: JSON.stringify({ [DF.file]: this.value })
				}).then(() => {
					this.closest('tr').querySelector('a').click()
					this.className = className(this.value === this.options[0].value)
				})
			}
		}, items.map(item =>
			r('option', {
				value: item,
				selected: item === selected
			}, item || Strings.none))))
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
