import {
	createElement as r,
	t, classNames, restoreFocus, Fragment, defineClassNames
} from './dom-utils.js'

import { store } from './app-store.js'
import { Header } from './app-header.js'
import { TimerIcon, CloudIcon } from './app-icons.js'
import { PayloadViewer, previewMock } from './app-payload-viewer.js'

import CSS from './app.css' with { type: 'css' }
document.adoptedStyleSheets.push(CSS)
defineClassNames(CSS)


store.onError = onError
store.render = render
store.renderRow = renderRow

initRealTimeUpdates()
initKeyboardNavigation()

let mounted = false
function render() {
	restoreFocus(() => document.body.replaceChildren(App()))
	if (store.hasChosenLink)
		previewMock()
	mounted = true
}


const leftSideRef = {}

function App() {
	return Fragment(Header(), Main())
}


function Main() {
	return (
		r('main', null,
			r('div', {
					ref: leftSideRef,
					style: { width: leftSideRef.width },
					className: CSS.leftSide
				},
				r('div', { className: CSS.SubToolbar },
					GroupByMethod(),
					BulkSelector()),
				r('div', { className: CSS.Table },
					MockList(),
					StaticFilesList())),
			r('div', { className: CSS.rightSide },
				Resizer(leftSideRef),
				PayloadViewer())))

}


function GroupByMethod() {
	return (
		r('label', { className: CSS.GroupByMethod },
			r('input', {
				type: 'checkbox',
				checked: store.groupByMethod,
				onChange: store.toggleGroupByMethod
			}),
			r('span', { className: CSS.checkboxBody }, t`Group by Method`)))
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
		r('label', { className: CSS.BulkSelector },
			r('span', null, t`Bulk Select`),
			r('select', {
					autocomplete: 'off',
					disabled,
					title: disabled
						? t`No mock files have comments which are anything within parentheses on the filename.`
						: undefined,
					onChange
				},
				r('option', { value: firstOption }, firstOption),
				r('hr'),
				comments.map(value => r('option', { value }, value)))))
}



function MockList() {
	if (!Object.keys(store.brokersByMethod).length)
		return r('div', null, t`No mocks found`)

	if (store.groupByMethod)
		return Object.keys(store.brokersByMethod).map(method =>
			Fragment(
				r('div', classNames(CSS.TableHeading, store.canProxy && CSS.canProxy), method),
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
				...classNames(CSS.TableRow,
					mounted && row.isNew && CSS.animIn)
			},
			store.canProxy && ProxyToggler(method, urlMask, row.proxied),

			DelayToggler({
				checked: row.delayed,
				commit(checked) {
					store.setDelayed(method, urlMask, checked)
				},
			}),

			StatusCodeToggler({
				title: t`Internal Server Error`,
				body: t`500`,
				disabled: row.opts.length === 1 && row.status === 500,
				checked: !row.proxied && row.status === 500,
				commit() {
					store.toggle500(method, urlMask)
				}
			}),

			!store.groupByMethod && r('span', { className: CSS.Method }, method),

			PreviewLink(method, urlMask, row.urlMaskDittoed, i === 0),

			MockSelector(row)))
}

function renderRow(method, urlMask) {
	unChooseOld()
	const row = store.brokerAsRow(method, urlMask)
	const tr = leftSideRef.elem.querySelector(`.${CSS.TableRow}[key="${row.key}"]`)
	mergeTableRow(tr, Row(row))
	previewMock()

	function unChooseOld() {
		return leftSideRef.elem.querySelector(`a.${CSS.chosen}`)
			?.classList.remove(CSS.chosen)
	}

	function mergeTableRow(oldRow, newRow) {
		for (let i = 0; i < newRow.children.length; i++) {
			const oldEl = oldRow.children[i]
			const newEl = newRow.children[i]
			switch (newEl.tagName) {
				case 'LABEL': {
					const oldInput = oldEl.querySelector('[type="checkbox"]')
					const newInput = newEl.querySelector('[type="checkbox"]')
					oldInput.checked = newInput.checked
					oldInput.disabled = newInput.disabled
					break
				}
				case 'A':
					oldEl.className = newEl.className
					break
				case 'SELECT':
					oldEl.replaceChildren(...newEl.cloneNode(true).children)
					oldEl.className = newEl.className
					oldEl.disabled = newEl.disabled
					oldEl.value = newEl.value
					break
			}
		}
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
			...classNames(CSS.PreviewLink,
				isChosen && CSS.chosen),
			href: urlMask,
			autofocus,
			onClick
		}, ditto
			? [r('span', { className: CSS.dittoDir }, ditto), tail]
			: tail))
}


/** @param {BrokerRowModel} row */
function MockSelector(row) {
	return (
		r('select', {
			onChange() {
				store.selectFile(this.value)
			},
			onKeyDown(event) {
				if (event.key === 'ArrowRight' || event.key === 'ArrowLeft')
					event.preventDefault()
				// Because in Firefox they change the select.option, and 
				// we use those keys for spreadsheet-like navigation.
			},
			'aria-label': t`Mock Selector`,
			disabled: row.opts.length < 2,
			...classNames(
				CSS.MockSelector,
				row.selectedIdx > 0 && CSS.nonDefault,
				row.selectedFileIs4xx && CSS.status4xx)
		}, row.opts.map(([value, label, selected]) =>
			r('option', { value, selected }, label))))
}


function ProxyToggler(method, urlMask, checked) {
	return ClickDragToggler({
		className: CSS.ProxyToggler,
		title: t`Proxy Toggler`,
		checked,
		commit(checked) {
			store.setProxied(method, urlMask, checked)
		},
		body: CloudIcon()
	})
}



/** # StaticFilesList */

function StaticFilesList() {
	const rows = store.staticBrokersAsRows()
	return !rows.length
		? null
		: Fragment(
			r('div',
				classNames(CSS.TableHeading,
					store.canProxy && CSS.canProxy,
					!store.groupByMethod && CSS.nonGroupedByMethod),
				store.groupByMethod
					? t`Static GET`
					: t`Static`),
			rows.map(StaticRow))
}

/** @param {StaticBrokerRowModel} row */
function StaticRow(row) {
	const { groupByMethod } = store
	const [ditto, tail] = row.urlMaskDittoed
	return (
		r('div', {
				key: row.key,
				...classNames(CSS.TableRow,
					mounted && row.isNew && CSS.animIn)
			},

			DelayToggler({
				optClassName: store.canProxy && CSS.canProxy,
				checked: row.delayed,
				commit(checked) {
					store.setDelayedStatic(row.urlMask, checked)
				}
			}),

			StatusCodeToggler({
				title: t`Not Found`,
				body: t`404`,
				checked: row.status === 404,
				commit(checked) {
					store.setStaticRouteStatus(row.urlMask, checked
						? 404
						: 200)
				}
			}),

			!groupByMethod && r('span', { className: CSS.Method }, 'GET'),

			r('a', {
				href: row.urlMask,
				target: '_blank',
				className: CSS.PreviewLink,
			}, ditto
				? [r('span', { className: CSS.dittoDir }, ditto), tail]
				: tail)))
}

function StatusCodeToggler({ title, body, commit, checked, disabled }) {
	return ClickDragToggler({
		title,
		disabled,
		className: CSS.StatusCodeToggler,
		commit,
		checked,
		body
	})
}

function DelayToggler({ checked, commit, optClassName }) {
	return ClickDragToggler({
		canClickDrag: true,
		checked,
		commit,
		...classNames(CSS.DelayToggler, optClassName),
		title: t`Delay`,
		body: TimerIcon()
	})
}

function ClickDragToggler({ checked, commit, className, title, body }) {
	function onPointerEnter(event) {
		if (event.buttons === 1)
			onPointerDown.call(this, event)
	}

	function onPointerDown(event) {
		if (event.altKey) {
			onExclusiveClick.call(this)
			return
		}
		this.checked = !this.checked
		this.focus()
		commit(this.checked)
	}

	function onExclusiveClick() {
		const selector = selectorForColumnOf(this)
		if (!selector)
			return

		// Uncheck all other in the column. 
		for (const elem of leftSideRef.elem.querySelectorAll(selector))
			if (elem !== this && elem.checked && !elem.disabled) {
				elem.checked = false
				elem.dispatchEvent(new Event('change'))
			}

		if (!this.checked) {
			this.checked = true
			this.dispatchEvent(new Event('change'))
		}
		this.focus()
	}

	function onClick(event) {
		if (event.pointerType === 'mouse')
			event.preventDefault()
	}
	function onChange() {
		commit(this.checked)
	}
	return (
		r('label', { ...classNames(CSS.Toggler, className), title },
			r('input', {
				type: 'checkbox',
				checked,
				onPointerEnter,
				onPointerDown,
				onClick,
				onChange
			}),
			r('span', { className: CSS.checkboxBody }, body)))
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
		const MIN_LEFT_WIDTH = 350
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



/**
 * # Long polls UI sync version
 * The version increments when a mock file is added, removed, or renamed.
 */
function initRealTimeUpdates() {
	let oldVersion = -1
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
			if (!response.ok)
				throw response.status

			if (ErrorToast.isOffline)
				ErrorToast.close()

			const version = await response.json()
			if (oldVersion !== version) { // because it could be < or >
				oldVersion = version
				store.fetchState()
			}
			longPoll()
		}
		catch (error) {
			if (error !== '_hidden_tab_')
				setTimeout(longPoll, 3000)
		}
	}
}

function selectorForColumnOf(elem) {
	return columnSelectors().find(s => elem?.matches(s))
}

function columnSelectors() {
	return [
		`.${CSS.TableRow} .${CSS.ProxyToggler} input`,
		`.${CSS.TableRow} .${CSS.DelayToggler} input`,
		`.${CSS.TableRow} .${CSS.StatusCodeToggler} input`,
		`.${CSS.TableRow} .${CSS.PreviewLink}`,
		// No .MockSelector because down/up arrows have native behavior on them
	]
}


function initKeyboardNavigation() {
	const rowSelectors = [
		...columnSelectors(),
		`.${CSS.TableRow} .${CSS.MockSelector}:enabled`,
	]

	addEventListener('keydown', function ({ key }) {
		switch (key) {
			case 'ArrowDown':
			case 'ArrowUp': {
				const pivot = document.activeElement
				const sel = selectorForColumnOf(pivot)
				if (sel) {
					const offset = key === 'ArrowDown' ? +1 : -1
					const siblings = leftSideRef.elem.querySelectorAll(sel)
					circularAdjacent(offset, siblings, pivot).focus()
				}
				break
			}
			case 'ArrowRight':
			case 'ArrowLeft': {
				const pivot = document.activeElement
				const sel = rowSelectors.find(s => pivot?.matches(s))
				if (sel) {
					const offset = key === 'ArrowRight' ? +1 : -1
					const siblings = pivot.closest(`.${CSS.TableRow}`).querySelectorAll(rowSelectors.join(','))
					circularAdjacent(offset, siblings, pivot).focus()
				}
				break
			}
		}
	})

	function circularAdjacent(step, siblings, pivot) {
		const arr = Array.from(siblings)
		return arr[(arr.indexOf(pivot) + step + arr.length) % arr.length]
	}
}

