import {
	createElement as r,
	createSvgElement as s,
	className, restoreFocus, Defer, Fragment
} from './dom-utils.js'

import { store } from './app-store.js'
import { parseFilename } from './Filename.js'
import { HEADER_502 } from './ApiConstants.js'


const CSS = {
	BulkSelector: null,
	CookieSelector: null,
	DelayToggler: null,
	ErrorToast: null,
	FallbackBackend: null,
	Field: null,
	GlobalDelayField: null,
	GroupByMethod: null,
	InternalServerErrorToggler: null,
	Logo: null,
	MenuTrigger: null,
	Method: null,
	MockSelector: null,
	NotFoundToggler: null,
	PayloadViewer: null,
	PreviewLink: null,
	ProgressBar: null,
	ProxyToggler: null,
	ResetButton: null,
	Resizer: null,
	SaveProxiedCheckbox: null,
	SettingsMenu: null,
	Table: null,
	TableHeading: null,
	TableRow: null,

	animIn: null,
	canProxy: null,
	checkboxBody: null,
	chosen: null,
	dittoDir: null,
	leftSide: null,
	nonDefault: null,
	nonGroupedByMethod: null,
	rightSide: null,
	status4xx: null,

	syntaxAttr: null,
	syntaxAttrVal: null,
	syntaxKey: null,
	syntaxPunc: null,
	syntaxStr: null,
	syntaxTag: null,
	syntaxVal: null
}
for (const k of Object.keys(CSS))
	CSS[k] = k


const FocusGroup = {
	ProxyToggler: 0,
	DelayToggler: 1,
	StatusToggler: 2,
	PreviewLink: 3
}

const t = translation => translation[0]

store.onError = onError
store.render = render
store.renderRow = renderRow
store.fetchState()
initRealTimeUpdates()
initKeyboardNavigation()

function render() {
	render.count++
	restoreFocus(() => document.body.replaceChildren(...App()))
	if (store.hasChosenLink)
		previewMock()
}
render.count = 0


const leftSideRef = {}

function App() {
	return [
		Header(),
		r('main', null,
			r('div', {
					ref: leftSideRef,
					style: { width: leftSideRef.width },
					className: CSS.leftSide
				},
				r('div', className(CSS.Table),
					MockList(),
					StaticFilesList())),
			r('div', { className: CSS.rightSide },
				Resizer(leftSideRef),
				PayloadViewer()))
	]
}

function Header() {
	return (
		r('header', null,
			r('a', {
					className: CSS.Logo,
					href: 'https://mockaton.com'
				},
				r('object', {
					data: 'logo.svg',
					type: 'image/svg+xml',
					width: 120,
					height: 22
				})),
			r('div', null,
				GlobalDelayField(),
				BulkSelector(),
				CookieSelector(),
				ProxyFallbackField(),
				ResetButton(),
				SettingsMenuTrigger())))
}

function GlobalDelayField() {
	function onChange() {
		store.setGlobalDelay(this.valueAsNumber)
	}
	function onWheel(event) {
		if (event.deltaY > 0)
			this.stepUp()
		else
			this.stepDown()
		clearTimeout(onWheel.timer)
		onWheel.timer = setTimeout(onChange.bind(this), 300)
	}
	return (
		r('label', className(CSS.Field, CSS.GlobalDelayField),
			r('span', null, t`Delay (ms)`),
			r('input', {
				type: 'number',
				min: 0,
				step: 100,
				autocomplete: 'none',
				value: store.delay,
				onChange,
				onWheel: [onWheel, { passive: true }]
			})))
}

function BulkSelector() {
	const { comments } = store
	const firstOption = t`Pick Comment…`
	function onChange() {
		const value = this.value
		this.value = firstOption // hack so it’s always selected
		store.bulkSelectByComment(value)
	}
	const disabled = !comments.length
	return (
		r('label', className(CSS.Field),
			r('span', null, t`Bulk Select`),
			r('select', {
					className: CSS.BulkSelector,
					autocomplete: 'off',
					disabled,
					title: disabled ? t`No mock files have comments which are anything within parentheses on the filename.` : '',
					onChange
				},
				r('option', { value: firstOption }, firstOption),
				r('hr'),
				comments.map(value => r('option', { value }, value)))))
	// TODO For a11y, use `menu` instead of `select`
}

function CookieSelector() {
	const { cookies } = store
	const disabled = cookies.length <= 1
	const list = cookies.length ? cookies : [[t`None`, true]]
	return (
		r('label', className(CSS.Field, CSS.CookieSelector),
			r('span', null, t`Cookie`),
			r('select', {
				autocomplete: 'off',
				disabled,
				title: disabled ? t`No cookies specified in config.cookies` : '',
				onChange() { store.selectCookie(this.value) }
			}, list.map(([value, selected]) =>
				r('option', { value, selected }, value)))))
}


function ProxyFallbackField() {
	const checkboxRef = {}
	function onChange() {
		checkboxRef.elem.disabled = !this.validity.valid || !this.value.trim()
		if (!this.validity.valid)
			this.reportValidity()
		else
			store.setProxyFallback(this.value.trim())
	}
	return (
		r('div', className(CSS.Field, CSS.FallbackBackend),
			r('label', null,
				r('span', null, t`Fallback`),
				r('input', {
					type: 'url',
					autocomplete: 'none',
					placeholder: t`Type backend address`,
					value: store.proxyFallback,
					onChange
				})),
			SaveProxiedCheckbox(checkboxRef)))
}

function SaveProxiedCheckbox(ref) {
	return (
		r('label', className(CSS.SaveProxiedCheckbox),
			r('input', {
				ref,
				type: 'checkbox',
				disabled: !store.canProxy,
				checked: store.collectProxied,
				onChange() { store.setCollectProxied(this.checked) }
			}),
			r('span', className(CSS.checkboxBody), t`Save Mocks`)))
}


function ResetButton() {
	return (
		r('button', {
			className: CSS.ResetButton,
			onClick: store.reset
		}, t`Reset`))
}


function SettingsMenuTrigger() {
	const id = '_settings_menu_'
	return (
		r('button', {
				title: t`Settings`,
				popovertarget: id,
				className: CSS.MenuTrigger
			},
			SettingsIcon(),
			Defer(() => SettingsMenu(id))))
}

function SettingsMenu(id) {
	const firstInputRef = {}
	return (
		r('menu', {
				id,
				popover: '',
				className: CSS.SettingsMenu,
				onToggle(event) {
					if (event.newState === 'open')
						firstInputRef.elem.focus()
				}
			},

			r('div', null,
				r('label', className(CSS.GroupByMethod),
					r('input', {
						ref: firstInputRef,
						type: 'checkbox',
						checked: store.groupByMethod,
						onChange: store.toggleGroupByMethod
					}),
					r('span', className(CSS.checkboxBody), t`Group by Method`)),

				r('a', {
					href: 'https://mockaton.com',
					target: '_blank',
					rel: 'noopener noreferrer'
				}, t`Website`),

				r('a', {
					href: 'https://github.com/ericfortis/mockaton',
					target: '_blank',
					rel: 'noopener noreferrer'
				}, t`Source Code`),

				r('p', null, `v${store.mockatonVersion}`)
			)))
}



/** # MockList */

function MockList() {
	if (!Object.keys(store.brokersByMethod).length)
		return r('div', null, t`No mocks found`)

	if (store.groupByMethod)
		return Object.keys(store.brokersByMethod).map(method => Fragment(
			r('div', className(CSS.TableHeading, store.canProxy && CSS.canProxy),
				method),
			store.brokersAsRowsByMethod(method).map(Row)))

	return store.brokersAsRowsByMethod('*').map(Row)
}

/**
 * @param {BrokerRowModel} row
 * @param {number} i
 */
function Row(row, i) {
	const { method, urlMask } = row
	return (
		r('div', {
				key: row.key,
				...className(CSS.TableRow,
					render.count > 1 && row.isNew && CSS.animIn)
			},
			store.canProxy && ProxyToggler(method, urlMask, row.proxied),

			DelayRouteToggler(method, urlMask, row.delayed),

			InternalServerErrorToggler(method, urlMask,
				!row.proxied && row.status === 500, // checked
				row.opts.length === 1 && row.status === 500), // disabled

			!store.groupByMethod && r('span', className(CSS.Method), method),

			PreviewLink(method, urlMask, row.urlMaskDittoed, i === 0),

			MockSelector(row)))
}

function renderRow(method, urlMask) {
	restoreFocus(() => {
		unChooseOld()
		const row = store.brokerAsRow(method, urlMask)
		trFor(row.key).replaceWith(Row(row))
		previewMock()
	})

	function trFor(key) {
		return leftSideRef.elem.querySelector(`.${CSS.TableRow}[key="${key}"]`)
	}
	function unChooseOld() {
		return leftSideRef.elem.querySelector(`a.${CSS.chosen}`)
			?.classList.remove(CSS.chosen)
	}
}


function PreviewLink(method, urlMask, urlMaskDittoed, autofocus) {
	function onClick(event) {
		event.preventDefault()
		store.previewLink(method, urlMask)
	}
	const isChosen = store.chosenLink.method === method && store.chosenLink.urlMask === urlMask
	const [ditto, tail] = urlMaskDittoed
	return (
		r('a', {
			...className(CSS.PreviewLink, isChosen && CSS.chosen),
			href: urlMask,
			autofocus,
			'data-focus-group': FocusGroup.PreviewLink,
			onClick
		}, ditto
			? [r('span', className(CSS.dittoDir), ditto), tail]
			: tail))
}


/** @param {BrokerRowModel} row */
function MockSelector(row) {
	return (
		r('select', {
			onChange() { store.selectFile(this.value) },
			autocomplete: 'off',
			'aria-label': t`Mock Selector`,
			disabled: row.opts.length < 2,
			...className(
				CSS.MockSelector,
				row.selectedIdx > 0 && CSS.nonDefault,
				row.selectedFileIs4xx && CSS.status4xx)
		}, row.opts.map(([value, label, selected]) =>
			r('option', { value, selected }, label))))
}


function DelayRouteToggler(method, urlMask, checked) {
	return ClickDragToggler({
		checked,
		commit(checked) { store.setDelayed(method, urlMask, checked) },
		focusGroup: FocusGroup.DelayToggler
	})
}

function InternalServerErrorToggler(method, urlMask, checked, disabled) {
	return (
		r('label', {
				className: CSS.InternalServerErrorToggler,
				title: t`Internal Server Error`
			},
			r('input', {
				type: 'checkbox',
				disabled,
				checked,
				onChange() { store.toggle500(method, urlMask) },
				'data-focus-group': FocusGroup.StatusToggler
			}),
			r('span', className(CSS.checkboxBody), t`500`)))
}

function ProxyToggler(method, urlMask, checked) {
	return (
		r('label', {
				className: CSS.ProxyToggler,
				title: t`Proxy Toggler`
			},
			r('input', {
				type: 'checkbox',
				checked,
				onChange() { store.setProxied(method, urlMask, this.checked) },
				'data-focus-group': FocusGroup.ProxyToggler
			}),
			CloudIcon()))
}



/** # StaticFilesList */

function StaticFilesList() {
	const rows = store.staticBrokersAsRows()
	return !rows.length
		? null
		: Fragment(
			r('div',
				className(CSS.TableHeading,
					store.canProxy && CSS.canProxy,
					!store.groupByMethod && CSS.nonGroupedByMethod),
				store.groupByMethod ? t`Static GET` : t`Static`),
			rows.map(StaticRow))
}

/** @param {StaticBrokerRowModel} row */
function StaticRow(row) {
	const { groupByMethod } = store
	const [ditto, tail] = row.urlMaskDittoed
	return (
		r('div', {
				key: row.key,
				...className(CSS.TableRow,
					render.count > 1 && row.isNew && CSS.animIn)
			},
			DelayStaticRouteToggler(row.urlMask, row.delayed),

			NotFoundToggler(row.urlMask, row.status === 404),

			!groupByMethod && r('span', className(CSS.Method), 'GET'),

			r('a', {
				href: row.urlMask,
				target: '_blank',
				className: CSS.PreviewLink,
				'data-focus-group': FocusGroup.PreviewLink
			}, ditto
				? [r('span', className(CSS.dittoDir), ditto), tail]
				: tail)))
}

function DelayStaticRouteToggler(route, checked) {
	return ClickDragToggler({
		optClassName: store.canProxy && CSS.canProxy,
		checked,
		focusGroup: FocusGroup.DelayToggler,
		commit(checked) {
			store.setDelayedStatic(route, checked)
		}
	})
}

function NotFoundToggler(route, checked) {
	return (
		r('label', {
				className: CSS.NotFoundToggler,
				title: t`Not Found`
			},
			r('input', {
				type: 'checkbox',
				checked,
				'data-focus-group': FocusGroup.StatusToggler,
				onChange() {
					store.setStaticRouteStatus(route, this.checked ? 404 : 200)
				}
			}),
			r('span', className(CSS.checkboxBody), t`404`)))
}


function ClickDragToggler({ checked, commit, focusGroup, optClassName }) {
	function onPointerEnter(event) {
		if (event.buttons === 1)
			onPointerDown.call(this)
	}
	function onPointerDown() {
		this.checked = !this.checked
		this.focus()
		commit(this.checked)
	}
	function onClick(event) {
		if (event.pointerType === 'mouse')
			event.preventDefault()
	}
	function onChange() {
		commit(this.checked)
	}
	return (
		r('label', {
				...className(CSS.DelayToggler, optClassName),
				title: t`Delay`
			},
			r('input', {
				type: 'checkbox',
				'data-focus-group': focusGroup,
				checked,
				onPointerEnter,
				onPointerDown,
				onClick,
				onChange
			}),
			TimerIcon()))
}

function Resizer(ref) {
	let raf = 0
	let initialX = 0
	let initialWidth = 0

	function onPointerDown(event) {
		initialX = event.clientX
		initialWidth = ref.elem.clientWidth
		addEventListener('pointerup', onUp, { once: true })
		addEventListener('pointermove', onMove)
		Object.assign(document.body.style, {
			cursor: 'col-resize',
			userSelect: 'none',
			pointerEvents: 'none'
		})
	}

	function onMove(event) {
		const MIN_LEFT_WIDTH = 340
		raf = raf || requestAnimationFrame(() => {
			ref.width = Math.max(initialWidth - (initialX - event.clientX), MIN_LEFT_WIDTH) + 'px'
			ref.elem.style.width = ref.width
			raf = 0
		})
	}

	function onUp() {
		removeEventListener('pointermove', onMove)
		cancelAnimationFrame(raf)
		raf = 0
		Object.assign(document.body.style, {
			cursor: 'auto',
			userSelect: 'auto',
			pointerEvents: 'auto'
		})
	}

	return (
		r('div', {
			className: CSS.Resizer,
			onPointerDown
		}))
}


/** # Payload Preview */

const payloadViewerTitleRef = {}
const payloadViewerCodeRef = {}

function PayloadViewer() {
	return (
		r('div', className(CSS.PayloadViewer),
			r('h2', { ref: payloadViewerTitleRef },
				!store.hasChosenLink && t`Preview`),
			r('pre', null,
				r('code', { ref: payloadViewerCodeRef },
					!store.hasChosenLink && t`Click a link to preview it`))))
}

function PayloadViewerTitle(file, statusText) {
	const { method, status, ext } = parseFilename(file)
	const fileNameWithComments = file.split('.').slice(0, -3).join('.')
	return (
		r('span', null,
			fileNameWithComments + '.' + method + '.',
			r('abbr', { title: statusText }, status),
			'.' + ext))
}

function PayloadViewerTitleWhenProxied(response) {
	const mime = response.headers.get('content-type') || ''
	const badGateway = response.headers.get(HEADER_502)
	return (
		r('span', null,
			badGateway
				? r('span', null, t`⛔ Fallback Backend Error` + ' ')
				: r('span', null, t`Got` + ' '),
			r('abbr', { title: response.statusText }, response.status),
			' ' + mime))
}

const SPINNER_DELAY = 80
function PayloadViewerProgressBar() {
	return (
		r('div', className(CSS.ProgressBar),
			r('div', { style: { animationDuration: store.delay - SPINNER_DELAY + 'ms' } })))
}

async function previewMock() {
	const { method, urlMask } = store.chosenLink

	previewMock.controller?.abort()
	previewMock.controller = new AbortController

	const spinnerTimer = setTimeout(() => {
		payloadViewerTitleRef.elem.replaceChildren(t`Fetching…`)
		payloadViewerCodeRef.elem.replaceChildren(PayloadViewerProgressBar())
	}, SPINNER_DELAY)

	try {
		const response = await fetch(urlMask, {
			method,
			signal: previewMock.controller.signal
		})
		clearTimeout(spinnerTimer)
		const { proxied, file } = store.brokerFor(method, urlMask)
		if (proxied || file)
			await updatePayloadViewer(proxied, file, response)
	}
	catch {
		payloadViewerCodeRef.elem.replaceChildren()
	}
}

async function updatePayloadViewer(proxied, file, response) {
	const mime = response.headers.get('content-type') || ''

	payloadViewerTitleRef.elem.replaceChildren(proxied
		? PayloadViewerTitleWhenProxied(response)
		: PayloadViewerTitle(file, response.statusText))

	if (mime.startsWith('image/')) // Naively assumes GET 200
		payloadViewerCodeRef.elem.replaceChildren(r('img', {
			src: URL.createObjectURL(await response.blob())
		}))
	else {
		const body = await response.text() || t`/* Empty Response Body */`
		if (mime === 'application/json')
			payloadViewerCodeRef.elem.replaceChildren(SyntaxJSON(body))
		else if (isXML(mime))
			payloadViewerCodeRef.elem.replaceChildren(SyntaxXML(body))
		else
			payloadViewerCodeRef.elem.textContent = body
	}
}

function isXML(mime) {
	return ['text/html', 'text/xml', 'application/xml'].some(m => mime.includes(m))
		|| /application\/.*\+xml/.test(mime)
}


async function onError(error) {
	if (error?.name === 'AbortError')
		return

	let msg = ''
	let isOffline = false

	if (error instanceof Response) {
		if (error.status === 422)
			msg = await error.text()
		else if (error.statusText)
			msg = error.statusText
	}
	else if (error?.message === 'Failed to fetch') {
		msg = t`Looks like the Mockaton server is not running`
		isOffline = true
	}
	else
		msg = error?.message || t`Unexpected Error`

	ErrorToast(msg, isOffline)
	console.error(error)
}

function ErrorToast(msg, isOffline) {
	ErrorToast.isOffline = isOffline
	ErrorToast.ref.elem?.remove()
	document.body.appendChild(
		r('div', {
			role: 'alert',
			ref: ErrorToast.ref,
			className: CSS.ErrorToast,
			onClick: ErrorToast.close
		}, msg))
}
ErrorToast.isOffline = false
ErrorToast.ref = {}
ErrorToast.close = () => {
	document.startViewTransition(() =>
		ErrorToast.ref.elem?.remove())
}


/** # Icons */

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

function SettingsIcon() {
	return (
		s('svg', { viewBox: '0 0 24 24' },
			s('path', { d: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6' })))
}


/**
 * # Long polls UI sync version
 * The version increments when a mock file is added, removed, or renamed.
 */
function initRealTimeUpdates() {
	let oldVersion = undefined // undefined so it waits until next event or timeout 
	let controller = new AbortController()

	longPoll()
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) {
			controller.abort('_hidden_tab_')
			controller = new AbortController()
		}
		else
			longPoll()
	})

	async function longPoll() {
		try {
			const response = await store.getSyncVersion(oldVersion, controller.signal)
			if (response.ok) {
				if (ErrorToast.isOffline)
					ErrorToast.close()

				const version = await response.json()
				const shouldSkip = oldVersion === undefined
				if (oldVersion !== version) { // because it could be < or >
					oldVersion = version
					if (!shouldSkip)
						store.fetchState()
				}
				longPoll()
			}
			else
				throw response.status
		}
		catch (error) {
			if (error !== '_hidden_tab_')
				setTimeout(longPoll, 3000)
		}
	}
}


function initKeyboardNavigation() {
	addEventListener('keydown', onKeyDown)

	function onKeyDown(event) {
		const pivot = document.activeElement
		switch (event.key) {
			case 'ArrowDown':
			case 'ArrowUp': {
				let fg = pivot.getAttribute('data-focus-group')
				if (fg !== null) {
					const offset = event.key === 'ArrowDown' ? +1 : -1
					circularAdjacent(offset, allInFocusGroup(+fg), pivot).focus()
				}
				break
			}
			case 'ArrowRight':
			case 'ArrowLeft': {
				if (pivot.hasAttribute('data-focus-group') || pivot.classList.contains(CSS.MockSelector)) {
					const offset = event.key === 'ArrowRight' ? +1 : -1
					rowFocusable(pivot, offset).focus()
				}
				break
			}
		}
	}

	function rowFocusable(el, step) {
		const row = el.closest(`.${CSS.TableRow}`)
		if (row) {
			const focusables = Array.from(row.querySelectorAll('a, input, select:not(:disabled)'))
			return circularAdjacent(step, focusables, el)
		}
	}

	function allInFocusGroup(focusGroup) {
		return Array.from(leftSideRef.elem.querySelectorAll(
			`.${CSS.TableRow} [data-focus-group="${focusGroup}"]:is(input, a)`))
	}

	function circularAdjacent(step = 1, arr, pivot) {
		return arr[(arr.indexOf(pivot) + step + arr.length) % arr.length]
	}
}


function SyntaxJSON(json) {
	// Capture groups: [string, optional colon, punc]
	const regex = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?|([{}\[\],:\s]+)|\S+/g

	const MAX_NODES = 50_000
	let nNodes = 0

	const frag = new DocumentFragment()

	function span(className, textContent) {
		nNodes++
		const s = document.createElement('span')
		s.className = className
		s.textContent = textContent
		frag.appendChild(s)
	}

	function text(t) {
		nNodes++
		frag.appendChild(document.createTextNode(t))
	}

	let match
	let lastIndex = 0
	while ((match = regex.exec(json)) !== null) {
		if (nNodes > MAX_NODES)
			break

		if (match.index > lastIndex)
			text(json.slice(lastIndex, match.index))

		const [full, str, colon, punc] = match
		lastIndex = match.index + full.length

		if (str && colon) {
			span(CSS.syntaxKey, str)
			text(colon)
		}
		else if (punc) text(punc)
		else if (str) span(CSS.syntaxStr, str)
		else span(CSS.syntaxVal, full)
	}
	frag.normalize()
	text(json.slice(lastIndex))
	return frag
}


function SyntaxXML(xml) {
	// Capture groups: [tagPunc, tagName, attrName, attrVal]
	const regex = /(<\/?|\/?>|\?>)|(?<=<\??\/?)([A-Za-z_:][\w:.-]*)|([A-Za-z_:][\w:.-]*)(?==)|("(?:[^"\\]|\\.)*")/g

	const MAX_NODES = 50_000
	let nNodes = 0

	const frag = new DocumentFragment()

	function span(className, textContent) {
		nNodes++
		const s = document.createElement('span')
		s.className = className
		s.textContent = textContent
		frag.appendChild(s)
	}

	function text(t) {
		nNodes++
		frag.appendChild(document.createTextNode(t))
	}

	let match
	let lastIndex = 0
	while ((match = regex.exec(xml)) !== null) {
		if (nNodes > MAX_NODES)
			break

		if (match.index > lastIndex)
			text(xml.slice(lastIndex, match.index))

		lastIndex = match.index + match[0].length

		if (match[1]) span(CSS.syntaxPunc, match[1])
		else if (match[2]) span(CSS.syntaxTag, match[2])
		else if (match[3]) span(CSS.syntaxAttr, match[3])
		else if (match[4]) span(CSS.syntaxAttrVal, match[4])
	}
	text(xml.slice(lastIndex))
	frag.normalize()
	return frag
}


/*
 */
