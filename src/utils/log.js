export const log = new class {
	#level = 'normal'

	setLevel(level) {
		this.#level = level
	}

	info(...msg) {
		if (this.#level !== 'quiet')
			console.info([this.#date, 'INFO', ...msg].join('::'))
	}

	access(url, ...msg) {
		if (this.#level !== 'quiet')
			console.log([this.#date, 'ACCESS', this.#sanitizeURL(url), ...msg].join('::'))
	}

	warn(...msg) {
		console.warn([this.#date, 'WARN', ...msg].join('::'))
	}

	error(...msg) {
		console.error([this.#date, 'ERROR', ...msg].join('::'))
	}


	get #date() {
		return new Date().toISOString()
	}

	#sanitizeURL(url) {
		return decodeURIComponent(url).replace(/[\x00-\x1F\x7F\x9B]/g, '')
	}
}
