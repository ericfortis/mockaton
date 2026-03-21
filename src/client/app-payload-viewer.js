import {
	createElement as r,
	t, classNames, defineClassNames
} from './dom-utils.js'
import { parseFilename } from './Filename.js'
import { HEADER_502 } from './ApiConstants.js'
import { store } from './app-store.js'

import CSS from './app.css' with { type: 'css' }
defineClassNames(CSS)


const payloadViewerTitleRef = {}
const payloadViewerCodeRef = {}

export function PayloadViewer() {
	return (
		r('div', classNames(CSS.PayloadViewer),
			RightToolbar(),
			r('pre', null,
				r('code', { ref: payloadViewerCodeRef },
					!store.hasChosenLink && t`Click a link to preview it`))))
}

function RightToolbar() {
	return (
		r('div', classNames(CSS.SubToolbar),
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
		r('div', classNames(CSS.ProgressBar),
			r('div', {
				style: {
					animationDuration: store.delay - SPINNER_DELAY + 'ms'
				}
			})))
}

export async function previewMock() {
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
	catch (error) {
		clearTimeout(spinnerTimer)
		store.onError(error)
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
