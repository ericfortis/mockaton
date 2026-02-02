import {
	createElement as r,
	createSvgElement as s,
	className, restoreFocus, Fragment, adoptCSS
} from './dom-utils.js'

import { store } from './app-store.js'
import { parseFilename } from './Filename.js'
import { HEADER_502 } from './ApiConstants.js'

import CSS from './styles.css' with { type: 'css' }
adoptCSS(CSS)


const t = translation => translation[0]

store.onError = onError
store.render = render
store.renderRow = renderRow

initRealTimeUpdates()
initKeyboardNavigation()

let mounted = false
function render() {
	restoreFocus(() => document.body.replaceChildren(...App()))
	if (store.hasChosenLink)
		previewMock()
	mounted = true
}


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
				r('div', className(CSS.SubToolbar),
					GroupByMethod(),
					BulkSelector()),
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
					href: 'https://mockaton.com',
					alt: t`Documentation`
				},
				Logo()),
			r('div', null,
				r('div', className(CSS.GlobalDelayWrap),
					GlobalDelayField(),
					GlobalDelayJitterField()),
				CookieSelector(),
				ProxyFallbackField(),
				ResetButton(),
				HelpLink()
			)))
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

function GlobalDelayJitterField() {
	function onChange() {
		this.value = this.valueAsNumber.toFixed(0)
		this.value = Math.max(0, this.valueAsNumber)
		this.value = Math.min(300, this.valueAsNumber)
		store.setGlobalDelayJitter(this.valueAsNumber / 100)
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
		r('label', className(CSS.Field, CSS.GlobalDelayJitterField),
			r('span', null, t`Max Jitter %`),
			r('input', {
				type: 'number',
				min: 0,
				max: 300,
				step: 10,
				autocomplete: 'none',
				value: (store.delayJitter * 100).toFixed(0),
				onChange,
				onWheel: [onWheel, { passive: true }]
			})))
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
				title: disabled
					? t`No cookies specified in config.cookies`
					: undefined,
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
					name: 'fallback',
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


function HelpLink() {
	return (
		r('a', {
			target: '_blank',
			href: 'https://mockaton.com',
			title: t`Documentation`,
			className: CSS.HelpLink
		}, HelpIcon()))
}


/** # Left Side */


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
		r('label', className(CSS.BulkSelector),
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
	// TODO For a11y, use `menu` instead of `select`
}


function GroupByMethod() {
	return (
		r('label', className(CSS.GroupByMethod),
			r('input', {
				type: 'checkbox',
				checked: store.groupByMethod,
				onChange: store.toggleGroupByMethod
			}),
			r('span', className(CSS.checkboxBody), t`Group by Method`)))
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
					mounted && row.isNew && CSS.animIn)
			},
			store.canProxy && ProxyToggler(method, urlMask, row.proxied),

			DelayToggler({
				checked: row.delayed,
				commit(checked) { store.setDelayed(method, urlMask, checked) },
			}),

			StatusCodeToggler({
				title: t`Internal Server Error`,
				label: t`500`,
				disabled: row.opts.length === 1 && row.status === 500,
				checked: !row.proxied && row.status === 500,
				onChange() {
					store.toggle500(method, urlMask)
				}
			}),

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
			onClick
		}, ditto
			? [r('span', className(CSS.dittoDir), ditto), tail]
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
			...className(
				CSS.MockSelector,
				row.selectedIdx > 0 && CSS.nonDefault,
				row.selectedFileIs4xx && CSS.status4xx)
		}, row.opts.map(([value, label, selected]) =>
			r('option', { value, selected }, label))))
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
				...className(CSS.TableRow,
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
				label: t`404`,
				checked: row.status === 404,
				onChange() {
					store.setStaticRouteStatus(row.urlMask, this.checked
						? 404
						: 200)
				}
			}),

			!groupByMethod && r('span', className(CSS.Method), 'GET'),

			r('a', {
				href: row.urlMask,
				target: '_blank',
				className: CSS.PreviewLink,
			}, ditto
				? [r('span', className(CSS.dittoDir), ditto), tail]
				: tail)))
}

function StatusCodeToggler({ title, label, onChange, checked }) {
	return (
		r('label', {
				title,
				className: CSS.StatusCodeToggler
			},
			r('input', {
				type: 'checkbox',
				checked,
				onChange
			}),
			r('span', className(CSS.checkboxBody), label)))
}


function DelayToggler({ checked, commit, optClassName }) {
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


/** # Payload Preview */

const payloadViewerTitleRef = {}
const payloadViewerCodeRef = {}

function PayloadViewer() {
	return (
		r('div', className(CSS.PayloadViewer),
			RightToolbar(),
			r('pre', null,
				r('code', { ref: payloadViewerCodeRef },
					!store.hasChosenLink && t`Click a link to preview it`))))
}

function RightToolbar() {
	return (
		r('div', className(CSS.SubToolbar),
			r('h2', { ref: payloadViewerTitleRef },
				!store.hasChosenLink && t`Preview`)))
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
			r('div', {
				style: {
					animationDuration: store.delay - SPINNER_DELAY + 'ms'
				}
			})))
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


/** # Graphics */

function Logo() {
	return (
		s('svg', { viewBox: '0 0 556 100' },
			s('path', { d: 'm13.75 1.8789c-5.9487 0.19352-10.865 4.5652-11.082 11.686v81.445c-1e-7 2.216 1.784 4 4 4h4.793c2.216 0 4-1.784 4-4v-64.982c0.02794-3.4488 3.0988-3.5551 4.2031-1.1562l16.615 59.059c1.4393 5.3711 5.1083 7.9633 8.7656 7.9473 3.6573 0.01603 7.3263-2.5762 8.7656-7.9473l16.615-59.059c1.1043-2.3989 4.1752-2.2925 4.2031 1.1562v64.982c0 2.216 1.784 4 4 4h4.793c2.216 0 4-1.784 4-4v-81.445c-0.17732-7.0807-5.1334-11.492-11.082-11.686-5.9487-0.19352-12.652 3.8309-15.609 13.619l-15.686 57.334-15.686-57.334c-2.9569-9.7882-9.6607-13.813-15.609-13.619zm239.19 0.074219c-2.216 0-4 1.784-4 4v89.057c0 2.216 1.784 4 4 4h4.793c2.216 0 3.9868-1.784 4-4l0.10644-17.94c0.0734-0.07237 12.175-13.75 12.175-13.75 5.6772 11.091 11.404 22.158 17.113 33.232 1.0168 1.9689 3.4217 2.7356 5.3906 1.7188l4.2578-2.1992c1.9689-1.0168 2.7356-3.4217 1.7188-5.3906-6.4691-12.585-12.958-25.16-19.442-37.738l17.223-19.771c1.4555-1.671 1.2803-4.189-0.39062-5.6445l-3.6133-3.1465c-0.73105-0.63679-1.6224-0.96212-2.5176-0.98633-1.151-0.03113-2.3063 0.43508-3.125 1.375l-28.896 33.174v-51.99c0-2.216-1.784-4-4-4zm-58.255 23.316c-10.699 0-19.312 8.6137-19.312 19.312v34.535c0 10.699 8.6137 19.312 19.312 19.312h19.717c10.699 0 19.311-8.6137 19.311-19.312l-0.125-7.8457c0-2.216-1.784-4-4-4h-4.6524c-2.216 0-4 1.784-4 4l3e-3 6.7888c3e-3 3.8063-1.5601 9.3694-8.4716 9.3694h-15.846c-6.9115 0-8.4766-5.5631-8.4766-12.475v-26.209c0-6.9115 1.5651-12.477 8.4766-12.477h15.846c6.6937 0 8.3697 5.2207 8.4687 11.828v2.2207c0 2.216 1.784 4 4 4h4.6524c2.216 0 4-1.784 4-4l0.125-5.7363c0-10.699-8.6117-19.312-19.311-19.312zm-72.182 0c-10.699 0-19.312 8.6137-19.312 19.312v34.535c0 10.699 8.6137 19.312 19.312 19.312h19.717c10.699 0 19.311-8.6137 19.311-19.312v-34.535c0-10.699-8.6117-19.312-19.311-19.312zm1.9356 11h15.846c6.9115 0 8.4746 5.5651 8.4746 12.477v26.209c0 6.9115-1.5631 12.475-8.4746 12.475h-15.846c-6.9115 0-8.4766-5.5631-8.4766-12.475v-26.209c0-6.9115 1.5651-12.477 8.4766-12.477z' }),
			s('path', { opacity: 0.75, d: 'm331.9 25.27c-10.699 0-19.312 8.6137-19.312 19.312v4.3682c0 2.216 1.784 4 4 4h4.7715c2.216 0 4-1.784 4-4v-0.20414c0-6.9115 1.5651-12.477 8.4766-12.477h15.846c6.9115 0 8.4746 5.5651 8.4746 12.477v7.0148h-28.059c-10.699 0-19.312 8.6117-19.312 19.311v4.0477c0 10.699 8.6137 19.313 19.312 19.312h17.812c2.216-1e-6 4-1.784 4-4v-4.7715c0-2.216-1.784-4-4-4h-13.648c-6.9115-2e-5 -12.477-1.5651-12.477-8.5649 0-6.9998 5.5651-8.5629 12.477-8.5629h23.895v25.897c0 2.216 1.784 4 4 4h4.7715c2.216-1e-6 4-1.784 4-4v-49.848c0-10.699-8.6117-19.312-19.311-19.312z' }),
			s('path', { d: 'm392.75 1.373c-2.216 0-4 1.784-4 4v18.043h-5.3086c-2.216 0-4 1.784-4 4v4.793c0 2.216 1.784 4 4 4h5.3086v51.398c0 6.1465 3.7064 10.823 9.232 10.823h16.531c2.216 0 4-1.784 4-4v-4.793c0-2.216-1.784-4-4-4h-12.97v-49.428h9.8711c2.216 0 4-1.784 4-4v-4.793c0-2.216-1.784-4-4-4h-9.8711v-18.043c0-2.216-1.784-4-4-4zm122.96 23.896c-10.699 0-19.312 8.6137-19.312 19.312v49.812c0 2.216 1.784 4 4 4h4.7715c2.216 0 4-1.784 4-4v-45.648c0-6.9115 1.5651-12.477 8.4766-12.477h15.846c6.9115 0 8.4746 5.5651 8.4746 12.477v45.684c0 2.216 1.784 4 4 4h4.7715c2.216-1e-6 4-1.784 4-4v-49.848c0-10.699-8.6117-19.312-19.311-19.312zm-69.999 0c-10.699 0-19.312 8.6137-19.312 19.312v34.535c0 10.699 8.6137 19.312 19.312 19.312h19.717c10.699 0 19.311-8.6137 19.311-19.312v-34.535c0-10.699-8.6117-19.312-19.311-19.312zm1.9356 11h15.846c6.9115 0 8.4746 5.5651 8.4746 12.477v26.209c0 6.9115-1.5631 12.475-8.4746 12.475h-15.846c-6.9115 0-8.4766-5.5631-8.4766-12.475v-26.209c0-6.9115 1.5651-12.477 8.4766-12.477z' })))
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
			s('path', { d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1 17h-2v-2h2zm2.07-7.75-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25' })))
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


function initKeyboardNavigation() {
	const columnSelectors = [
		`.${CSS.TableRow} .${CSS.ProxyToggler} input`,
		`.${CSS.TableRow} .${CSS.DelayToggler} input`,
		`.${CSS.TableRow} .${CSS.StatusCodeToggler} input`,
		`.${CSS.TableRow} .${CSS.PreviewLink}`,
		// No .MockSelector because down/up arrows have native behavior on them
	]

	const rowSelectors = [
		...columnSelectors,
		`.${CSS.TableRow} .${CSS.MockSelector}:enabled`,
	]

	addEventListener('keydown', function ({ key }) {
		switch (key) {
			case 'ArrowDown':
			case 'ArrowUp': {
				const pivot = document.activeElement
				const sel = columnSelectors.find(s => pivot?.matches(s))
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
