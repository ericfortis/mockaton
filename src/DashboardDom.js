export function className(...args) {
	return {
		className: args.filter(Boolean).join(' ')
	}
}

export function createElement(tag, props, ...children) {
	const node = document.createElement(tag)
	for (const [k, v] of Object.entries(props || {}))
		if (k === 'ref') v.current = node
		else if (k === 'style') Object.assign(node.style, v)
		else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), ...[v].flat())
		else if (k in node) node[k] = v
		else node.setAttribute(k, v)
	node.append(...children.flat().filter(Boolean))
	return node
}

export function createSvgElement(tagName, props, ...children) {
	const elem = document.createElementNS('http://www.w3.org/2000/svg', tagName)
	for (const [k, v] of Object.entries(props))
		elem.setAttribute(k, v)
	elem.append(...children.flat().filter(Boolean))
	return elem
}

export function useRef() {
	return { current: null }
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
