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
