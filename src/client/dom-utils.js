export function className(...args) {
	return {
		className: args.filter(Boolean).join(' ')
	}
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

export function createSvgElement(tag, props, ...children) {
	const elem = document.createElementNS('http://www.w3.org/2000/svg', tag)
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



// Minimal implementation of CSS Modules in the browser
// TODO think about avoiding clashes when using multiple files. e.g.:
//  - should the user pass a prefix?, or
//  - should the ensure there's a unique top-level classname on each file
// TODO ignore rules in comments?
export function adoptCSS(sheet) {
	document.adoptedStyleSheets.push(sheet)
	Object.assign(sheet, extractClassNames(sheet.cssRules))
}

export function extractClassNames(cssRules) {
	// Class names must begin with _ or a letter, then it can have numbers and hyphens
	const reClassName = /(?:^|[\s,{>])&?\s*\.([a-zA-Z_][\w-]*)/g
	
	const cNames = {}
	let match
	for (const rule of cssRules) 
		while (match = reClassName.exec(rule.cssText))
			cNames[match[1]] = match[1]
	return cNames
}

