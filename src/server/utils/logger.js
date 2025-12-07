import { decode, reControlAndDelChars } from './HttpIncomingMessage.js'


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
			console.log(this.#msg('MOCK', url, ...msg))
	}

	access(response, error = '') {
		if (this.#level === 'verbose')
			console.log(this.#msg(
				'ACCESS',
				response.req.method,
				response.statusCode,
				response.req.url,
				error))
	}

	warn(...msg) {
		console.warn(this.#msg('WARN', ...msg))
	}

	error(...msg) {
		console.error(this.#msg('ERROR', ...msg))
	}

	#msg(...msg) {
		if (!msg.at(-1))
			msg.pop()
		return [new Date().toISOString(), ...msg.map(this.#sanitize)].join('::')
	}

	#sanitize(url) {
		try {
			const decoded = decode(url)
			if (!decoded)
				return '__MULTI_ENCODED__'
			return decoded
				.replace(reControlAndDelChars, '')
				.slice(0, 200)
		}
		catch {
			return '__NON_DECODABLE__'
		}
	}
}
