export const logger = new class {
	#level = 'normal'

	setLevel(level) {
		this.#level = level
	}

	info(...msg) {
		if (this.#level !== 'quiet')
			console.info(this.#msg('INFO', ...msg))
	}

	accessMock(url, ...msg) {
		if (this.#level !== 'quiet')
			console.log(this.#msg('MOCK', this.#sanitizeURL(url), ...msg))
	}

	access(response) {
		if (this.#level === 'verbose')
			console.log(this.#msg(
				'ACCESS',
				response.req.method,
				response.statusCode,
				this.#sanitizeURL(response.req.url)))
	}

	warn(...msg) {
		console.warn(this.#msg('WARN', ...msg))
	}

	error(...msg) {
		console.error(this.#msg('ERROR', ...msg))
	}

	#msg(...msg) {
		return [new Date().toISOString(), ...msg].join('::')
	}
	
	#sanitizeURL(url) {
		return decodeURIComponent(url).replace(/[\x00-\x1F\x7F\x9B]/g, '')
	}
}
