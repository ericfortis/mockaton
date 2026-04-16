export function t(translation) {
	return translation[0]
}


export function createElement(tag, props, ...children) {
	const elem = document.createElement(tag)
	if (props)
		for (const [k, v] of Object.entries(props))
			if (v === undefined) continue
			else if (k === 'ref') v.elem = elem
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


export class QueryParamBool {
	constructor(param) {
		this.param = param
		this.value = this.#init()
	}

	#init() {
		const qs = new URLSearchParams(globalThis.location?.search)
		if (qs.has(this.param))
			return qs.get(this.param) !== '0'
		const stored = globalThis.localStorage?.getItem(this.param) !== '0'
		if (!stored)
			this.#applyToUrl(false)
		return stored
	}

	toggle() {
		this.value = !this.value
		if (this.value)
			globalThis.localStorage?.removeItem(this.param)
		else
			globalThis.localStorage?.setItem(this.param, '0')
		this.#applyToUrl(this.value)
	}

	#applyToUrl(nextVal) {
		const url = new URL(globalThis.location?.href)
		if (nextVal)
			url.searchParams.delete(this.param)
		else
			url.searchParams.set(this.param, '0')
		history.replaceState(null, '', url)
	}
}


export class LocalStorageSet {
	constructor(key) {
		this.key = key
		this.value = this.#parse()
	}

	add(item) {
		this.value.add(item)
		this.#persist()
	}

	delete(item) {
		this.value.delete(item)
		this.#persist()
	}

	has(item) {
		return this.value.has(item)
	}

	#parse() {
		try {
			return new Set(JSON.parse(globalThis.localStorage?.getItem(this.key) || '[]'))
		}
		catch {
			return new Set()
		}
	}

	#persist() {
		globalThis.localStorage?.setItem(this.key, JSON.stringify([...this.value]))
	}
}
