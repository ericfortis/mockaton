export function className(...args) {
	return { className: args.filter(Boolean).join(' ') }
}

export function elemRef(obj = undefined) {
	return Object.assign({ elem: null }, obj)
}

export function createElement(tag, props, ...children) {
	const elem = document.createElement(tag)
	for (const [k, v] of Object.entries(props || {}))
		if (k === 'ref') v.elem = elem
		else if (k === 'style') Object.assign(elem.style, v)
		else if (k.startsWith('on')) elem.addEventListener(k.slice(2).toLowerCase(), ...[v].flat())
		else if (k in elem) elem[k] = v
		else elem.setAttribute(k, v)
	elem.append(...children.flat().filter(Boolean))
	return elem
}

export function createSvgElement(tagName, props, ...children) {
	const elem = document.createElementNS('http://www.w3.org/2000/svg', tagName)
	for (const [k, v] of Object.entries(props))
		elem.setAttribute(k, v)
	elem.append(...children.flat().filter(Boolean))
	return elem
}

export function Fragment(...args) {
	const frag = new DocumentFragment()
	for (const arg of args)
		if (Array.isArray(arg))
			frag.append(...arg)
		else
			frag.appendChild(arg)
	return frag
}


export function Defer(cb) {
	const placeholder = document.createComment('')
	deferred(() => placeholder.replaceWith(cb()))
	return placeholder
}

export function deferred(cb) {
	return window.requestIdleCallback
		? requestIdleCallback(cb)
		: setTimeout(cb, 100) // Safari
}


export function restoreFocus(cb) {
	const focusQuery = selectorFor(document.activeElement)
	cb()
	if (focusQuery)
		document.querySelector(focusQuery)?.focus()
}

function selectorFor(elem) {
	if (!(elem instanceof Element))
		return
	const path = []
	while (elem) {
		let qualifier = ''
		if (elem.hasAttribute('key'))
			qualifier = `[key="${elem.getAttribute('key')}"]`
		else {
			let i = 0
			let sib = elem
			while ((sib = sib.previousElementSibling))
				if (sib.tagName === elem.tagName)
					i++
			if (i)
				qualifier = `:nth-of-type(${i + 1})`
		}
		path.push(elem.tagName + qualifier)
		elem = elem.parentElement
	}
	return path.reverse().join('>')
}
