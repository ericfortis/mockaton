export const cookie = new class {
	#cookies = {}
	#currentKey = ''

	init(cookies = {}) {
		this.#cookies = cookies
		const keys = Object.keys(cookies)
		if (keys.length)
			this.#currentKey = keys[0]
	}

	getCurrent() {
		return this.#cookies[this.#currentKey]
	}

	setCurrent(key) {
		if (key in this.#cookies)
			this.#currentKey = key
		else
			return 'Cookie key not found'
	}

	list() {
		return Object.keys(this.#cookies).map(key => [
			key,
			key === this.#currentKey // selected
		])
	}
}
