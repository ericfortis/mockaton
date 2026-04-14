import { createElement as r, t, defineClassNames } from './dom-utils.js'
import { HEADER_502 } from './ApiConstants.js'
import { parseFilename } from './Filename.js'
import { store } from './app-store.js'

import CSS from './app.css' with { type: 'css' }
defineClassNames(CSS)


const titleRef = {}
const codeRef = {}

export function PayloadViewer() {
	return (
		r('div', { className: CSS.PayloadViewer },

			r('div', { className: CSS.SubToolbar },
				r('h2', { ref: titleRef },
					!store.hasChosenLink && t`Preview`)),

			r('pre', null,
				r('code', { ref: codeRef },
					!store.hasChosenLink && t`Click a link to preview it`))))
}


function PayloadViewerTitle(file, statusText) {
	const { method, status, ext, isStatic } = parseFilename(file)

	if (isStatic)
		return r('span', null, file)

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
		r('div', { className: CSS.ProgressBar },
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
		titleRef.elem.replaceChildren(t`Fetching…`)
		codeRef.elem.replaceChildren(PayloadViewerProgressBar())
	}, SPINNER_DELAY)

	try {
		const response = await fetch(urlMask, {
			method,
			signal: previewMock.controller.signal
		})
		clearTimeout(spinnerTimer)
		const broker = store.brokerFor(method, urlMask)
		if (broker?.proxied || broker?.file)
			await updatePayloadViewer(broker.proxied, broker.file, response)
	}
	catch (error) {
		clearTimeout(spinnerTimer)
		store.onError(error)
		codeRef.elem.replaceChildren()
	}
}


async function updatePayloadViewer(proxied, file, response) {
	titleRef.elem.replaceChildren(proxied
		? PayloadViewerTitleWhenProxied(response)
		: PayloadViewerTitle(file, response.statusText))

	if (!response.ok || response.status === 204) {
		codeRef.elem.textContent = await bodyAsText()
		return
	}

	async function bodyAsText() {
		return (await response.text()) || t`/* Empty Response Body */`
	}

	const mime = response.headers.get('content-type') || ''

	if (mime.startsWith('image/'))
		codeRef.elem.replaceChildren(r('img', {
			src: URL.createObjectURL(await response.blob())
		}))

	else if (mime.startsWith('video/'))
		codeRef.elem.replaceChildren(r('video', {
			src: store.chosenLink.urlMask,
			controls: true
		}))

	else if (mime.startsWith('audio/'))
		codeRef.elem.replaceChildren(r('audio', {
			src: store.chosenLink.urlMask,
			controls: true
		}))

	else if (['text/html', 'application/pdf'].includes(mime))
		codeRef.elem.replaceChildren(r('iframe', {
			src: store.chosenLink.urlMask // using a blob is would need to allow inline styles etc in CSP
		}))

	else if (mime === 'application/json')
		codeRef.elem.replaceChildren(SyntaxJSON(await bodyAsText()))

	else if (['text/xml', 'application/xml'].includes(mime))
		codeRef.elem.replaceChildren(SyntaxXML(await bodyAsText()))

	else if (mime.startsWith('text/') || mime === 'application/yaml')
		codeRef.elem.textContent = await bodyAsText()

	else
		codeRef.elem.replaceChildren(r('a', {
			href: URL.createObjectURL(await response.blob()),
			download: store.chosenLink.urlMask
		}, t`Download`))
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
