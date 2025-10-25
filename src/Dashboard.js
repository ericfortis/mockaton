import { createElement as r, createSvgElement as s, className, restoreFocus, Defer, Fragment, useRef } from './DashboardDom.js'
import { store, dittoSplitPaths, BrokerRowModel } from './DashboardStore.js'
import { HEADER_FOR_502 } from './ApiConstants.js'
import { parseFilename } from './Filename.js'


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
	MenuTrigger: null,
	Method: null,
	MockList: null,
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

	chosen: null,
	dittoDir: null,
	leftSide: null,
	nonDefault: null,
	rightSide: null,
	status4xx: null,

	json: null,
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

store.onError = onError
store.render = render
store.renderRow = renderRow
store.fetchState()
initRealTimeUpdates()
initKeyboardNavigation()

function render() {
	restoreFocus(() => document.body.replaceChildren(...App()))
	if (store.hasChosenLink)
		previewMock()
}

const t = translation => translation[0]

const leftSideRef = useRef()

function App() {
	return [
		Header(),
		r('main', null,
			r('div', {
					ref: leftSideRef,
					style: { width: store.leftSideWidth + 'px' },
					className: CSS.leftSide
				},
				r('table', null,
					MockList(),
					StaticFilesList())),
			r('div', { className: CSS.rightSide },
				Resizer(),
				PayloadViewer()))
	]
}

function Header() {
	return (
		r('header', null,
			r('img', {
				alt: t`Mockaton`,
				src: 'Logo.svg',
				width: 120,
				height: 22
			}),
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
	// TODO For a11y, this should be a `menu` instead of this `select`
	const { comments } = store
	const firstOption = t`Pick Comment…`
	function onChange() {
		const value = this.value
		this.value = firstOption // Hack
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
				comments.map(value => r('option', { value }, value))
			)))
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
	const checkboxRef = useRef()
	function onChange() {
		checkboxRef.current.disabled = !this.validity.valid || !this.value.trim()
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
			r('span', null, t`Save Mocks`)))
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
	const firstInputRef = useRef()
	return (
		r('menu', {
				id,
				popover: '',
				className: CSS.SettingsMenu,
				onToggle(event) {
					if (event.newState === 'open')
						firstInputRef.current.focus()
				}
			},

			r('label', className(CSS.GroupByMethod),
				r('input', {
					ref: firstInputRef,
					type: 'checkbox',
					checked: store.groupByMethod,
					onChange: store.toggleGroupByMethod
				}),
				r('span', null, t`Group by Method`)),

			r('a', {
				href: 'https://github.com/ericfortis/mockaton',
				target: '_blank',
				rel: 'noopener noreferrer'
			}, t`Documentation`)))
}



/** # MockList */

function MockList() {
	if (!Object.keys(store.brokersByMethod).length)
		return r('div', null, t`No mocks found`)

	if (store.groupByMethod)
		return Object.keys(store.brokersByMethod).map(method => Fragment(
			r('tr', null,
				r('th', { colspan: 2 + Number(store.canProxy) }),
				r('th', null, method)),
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
		r('tr', { key: Row.key(method, urlMask) },
			store.canProxy && r('td', null,
				ProxyToggler(method, urlMask, row.proxied)),

			r('td', null,
				DelayRouteToggler(method, urlMask, row.delayed)),

			r('td', null,
				InternalServerErrorToggler(method, urlMask, !row.proxied && row.status === 500)),

			!store.groupByMethod && r('td', className(CSS.Method),
				method),

			r('td', null,
				PreviewLink(method, urlMask, row.urlMaskDittoed, i === 0)),

			r('td', null,
				MockSelector(row))))
}
Row.key = (method, urlMask) => method + '::' + urlMask

function renderRow(method, urlMask) {
	restoreFocus(() => {
		unChooseOld()
		trFor(Row.key(method, urlMask))
			.replaceWith(Row(store.brokerAsRow(method, urlMask)))
		previewMock()
	})

	function trFor(key) {
		return leftSideRef.current.querySelector(`tr[key="${key}"]`)
	}
	function unChooseOld() {
		return leftSideRef.current.querySelector(`td > .${CSS.chosen}`)
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

function InternalServerErrorToggler(method, urlMask, checked) {
	return (
		r('label', {
				className: CSS.InternalServerErrorToggler,
				title: t`Internal Server Error`
			},
			r('input', {
				type: 'checkbox',
				checked,
				onChange() { store.toggle500(method, urlMask) },
				'data-focus-group': FocusGroup.StatusToggler
			}),
			r('span', null, t`500`)))
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
	const { staticBrokers, canProxy, groupByMethod } = store
	if (!Object.keys(staticBrokers).length)
		return null

	const dp = dittoSplitPaths(Object.keys(staticBrokers)).map(([ditto, tail]) => ditto
		? [r('span', className(CSS.dittoDir), ditto), tail]
		: tail)
	return (
		Fragment(
			r('tr', null,
				r('th', { colspan: (2 + Number(!groupByMethod)) + Number(canProxy) }),
				r('th', null, t`Static GET`)),
			Object.values(staticBrokers).map(({ route, status, delayed }, i) =>
				r('tr', null,
					canProxy && r('td'),
					r('td', null,
						DelayStaticRouteToggler(route, delayed)),

					r('td', null,
						NotFoundToggler(route, status === 404)),

					!groupByMethod && r('td', className(CSS.Method),
						'GET'),

					r('td', null,
						r('a', {
							href: route,
							target: '_blank',
							className: CSS.PreviewLink,
							'data-focus-group': FocusGroup.PreviewLink
						}, dp[i]))
				))))
}

function DelayStaticRouteToggler(route, checked) {
	return ClickDragToggler({
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
			r('span', null, t`404`)))
}


function ClickDragToggler({ checked, commit, focusGroup }) {
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
				className: CSS.DelayToggler,
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

function Resizer() {
	let raf = 0
	let initialX = 0
	let panelWidth = 0

	function onPointerDown(event) {
		initialX = event.clientX
		panelWidth = leftSideRef.current.clientWidth
		addEventListener('pointerup', onUp, { once: true })
		addEventListener('pointermove', onMove)
		Object.assign(document.body.style, {
			cursor: 'col-resize',
			userSelect: 'none',
			pointerEvents: 'none'
		})
	}

	function onMove(event) {
		const MIN_LEFT_WIDTH = 380
		raf = raf || requestAnimationFrame(() => {
			store.leftSideWidth = Math.max(panelWidth - (initialX - event.clientX), MIN_LEFT_WIDTH)
			leftSideRef.current.style.width = store.leftSideWidth + 'px'
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

const payloadViewerTitleRef = useRef()
const payloadViewerCodeRef = useRef()

function PayloadViewer() {
	return (
		r('div', className(CSS.PayloadViewer),
			r('h2', { ref: payloadViewerTitleRef },
				!store.hasChosenLink && t`Preview`),
			r('pre', null,
				r('code', { ref: payloadViewerCodeRef },
					!store.hasChosenLink && t`Click a link to preview it`))))
}

function PayloadViewerTitle({ file, statusText }) {
	const { method, status, ext } = parseFilename(file)
	const fileNameWithComments = file.split('.').slice(0, -3).join('.')
	return (
		r('span', null,
			fileNameWithComments + '.' + method + '.',
			r('abbr', { title: statusText }, status),
			'.' + ext))
}

function PayloadViewerTitleWhenProxied({ mime, status, statusText, gatewayIsBad }) {
	return (
		r('span', null,
			gatewayIsBad
				? r('span', null, t`⛔ Fallback Backend Error` + ' ')
				: r('span', null, t`Got` + ' '),
			r('abbr', { title: statusText }, status),
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
		payloadViewerTitleRef.current.replaceChildren(t`Fetching…`)
		payloadViewerCodeRef.current.replaceChildren(PayloadViewerProgressBar())
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
		payloadViewerCodeRef.current.replaceChildren()
	}
}

async function updatePayloadViewer(proxied, file, response) {
	const mime = response.headers.get('content-type') || ''

	payloadViewerTitleRef.current.replaceChildren(
		proxied
			? PayloadViewerTitleWhenProxied({
				mime,
				status: response.status,
				statusText: response.statusText,
				gatewayIsBad: response.headers.get(HEADER_FOR_502)
			})
			: PayloadViewerTitle({
				file,
				statusText: response.statusText
			}))

	if (mime.startsWith('image/'))  // Naively assumes GET.200
		payloadViewerCodeRef.current.replaceChildren(
			r('img', { src: URL.createObjectURL(await response.blob()) }))
	else {
		const body = await response.text() || t`/* Empty Response Body */`
		if (mime === 'application/json')
			payloadViewerCodeRef.current.replaceChildren(r('span', className(CSS.json), SyntaxJSON(body)))
		else if (isXML(mime))
			payloadViewerCodeRef.current.replaceChildren(SyntaxXML(body))
		else
			payloadViewerCodeRef.current.textContent = body
	}
}

function isXML(mime) {
	return ['text/html', 'text/xml', 'application/xml'].some(m => mime.includes(m))
		|| /application\/.*\+xml/.test(mime)
}


async function onError(_error) {
	let error = _error

	if (_error instanceof Response) {
		if (_error.status === 422)
			error = await _error.text()
		else if (_error.statusText)
			error = _error.statusText
	}
	else {
		if (error?.name === 'AbortError')
			return
		if (error?.message === 'Failed to fetch')
			error = t`Looks like the Mockaton server is not running` // TODO clear Error if comes back in ui-sync
		else
			error = error || t`Unexpected Error`
	}
	showErrorToast(error)
	console.error(_error)
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
	let oldSyncVersion = -1
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
			const response = await store.getSyncVersion(oldSyncVersion, controller.signal)
			if (response.ok) {
				const syncVersion = await response.json()
				const skipUpdate = oldSyncVersion === -1
				if (oldSyncVersion !== syncVersion) { // because it could be < or >
					oldSyncVersion = syncVersion
					if (!skipUpdate)
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
		const row = el.closest('tr')
		if (row) {
			const focusables = Array.from(row.querySelectorAll('a, input, select:not(:disabled)'))
			return circularAdjacent(step, focusables, el)
		}
	}

	function allInFocusGroup(focusGroup) {
		return Array.from(leftSideRef.current.querySelectorAll(
			`tr > td [data-focus-group="${focusGroup}"]:is(input, a)`))
	}

	function circularAdjacent(step = 1, arr, pivot) {
		return arr[(arr.indexOf(pivot) + step + arr.length) % arr.length]
	}
}


function SyntaxJSON(json) {
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
	SyntaxJSON.regex.lastIndex = 0 // resets regex
	while ((match = SyntaxJSON.regex.exec(json)) !== null) {
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
SyntaxJSON.regex = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?|([{}\[\],:\s]+)|\S+/g
// Capture group order: [string, optional colon, punc]


function SyntaxXML(xml) {
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
	SyntaxXML.regex.lastIndex = 0
	while ((match = SyntaxXML.regex.exec(xml)) !== null) {
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
SyntaxXML.regex = /(<\/?|\/?>|\?>)|(?<=<\??\/?)([A-Za-z_:][\w:.-]*)|([A-Za-z_:][\w:.-]*)(?==)|("(?:[^"\\]|\\.)*")/g
// Capture groups order:  [tagPunc, tagName, attrName, attrVal]

