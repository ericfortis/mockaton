import { createElement as r, t, restoreFocus, Fragment } from './utils/dom.js'

import { store } from './app-store.js'
import { API } from './ApiConstants.js'
import { Header } from './app-header.js'
import { extractClassNames } from './utils/css.js'
import { PayloadViewer, previewMock } from './app-payload-viewer.js'
import { MockList, initKeyboardNavigation, renderRow } from './app-mock-list.js'

import CSS from './app.css' with { type: 'css' }
CSS.__url = 'app.css'
document.adoptedStyleSheets.push(CSS)
Object.assign(CSS, extractClassNames(CSS))

store.onError = onError
store.render = render
store.renderRow = renderRow

onRealTimeUpdate(store.fetchState)
initKeyboardNavigation()

function render() {
	restoreFocus(() => document.body.replaceChildren(App()))
	if (store.hasChosenLink) previewMock()
	if (!store.mounted) LeftSide.$('a')?.focus()
	store.mounted = true
}

function App() {
	return Fragment(
		Header(),
		r('main', null,
			LeftSide(),
			r('div', { className: CSS.rightSide },
				Resizer(),
				PayloadViewer())))
}

function LeftSide() {
	return (
		r('div', {
				ref: LeftSide.ref,
				style: { width: LeftSide.ref.width },
				className: CSS.leftSide
			},
			MockList()))
}
LeftSide.ref = { width: undefined }
LeftSide.$ = selector => LeftSide.ref.elem.querySelector(selector)


function Resizer() {
	let raf = 0
	let initialX = 0
	let initialWidth = 0

	function onPointerDown(event) {
		initialX = event.clientX
		initialWidth = LeftSide.ref.elem.clientWidth
		addEventListener('pointerup', onUp, { once: true })
		addEventListener('pointermove', onMove)
		Object.assign(document.body.style, {
			cursor: 'col-resize',
			userSelect: 'none',
			pointerEvents: 'none'
		})
	}

	function onMove(event) {
		const MIN_LEFT_WIDTH = 350
		raf = raf || requestAnimationFrame(() => {
			LeftSide.ref.width = Math.max(initialWidth - (initialX - event.clientX), MIN_LEFT_WIDTH) + 'px'
			LeftSide.ref.elem.style.width = LeftSide.ref.width
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
		msg = t`Looks like Mockaton server is not running`
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



/** The version increments when a mock file is added, removed, or renamed. */
function onRealTimeUpdate(onUpdate) {
	let oldVersion = -1
	let conn = null
	let timer = null

	connect()
	document.addEventListener('visibilitychange', () => {
		if (document.hidden)
			teardown()
		else
			connect()
	})
	window.addEventListener('beforeunload', teardown)

	function connect() {
		if (conn) return

		clearTimeout(timer)
		conn = new EventSource(API.syncVersion)

		conn.onmessage = function (event) {
			if (ErrorToast.isOffline)
				ErrorToast.close()

			const version = Number(event.data)
			if (oldVersion !== version) {
				oldVersion = version
				onUpdate()
			}
		}

		conn.onerror = function () {
			teardown()
			timer = setTimeout(connect, 3000)
		}
	}

	function teardown() {
		clearTimeout(timer)
		conn?.close()
		conn = null
	}
}
