import http, { METHODS } from 'node:http'


export const methodIsSupported = method => METHODS.includes(method)

export function removeQueryStringAndFragment(url = '') {
	return new URL(url, 'http://_').pathname
}

export class BodyReaderError extends Error {
	name = 'BodyReaderError'
	constructor(msg) {
		super()
		this.message = msg
	}
}

export class IncomingMessage extends http.IncomingMessage {
	json() {
		return this.body(JSON.parse)
	}

	async body(parser = a => a) {
		const MAX_BODY_SIZE = 200 * 1024
		const expectedLength = this.headers['content-length'] | 0

		const chunks = []
		let lengthSoFar = 0
		for await (const chunk of this) {
			lengthSoFar += chunk.length
			if (lengthSoFar > MAX_BODY_SIZE)
				throw new BodyReaderError(`Body too large. Max is ${MAX_BODY_SIZE} bytes`)
			chunks.push(chunk)
		}

		if (lengthSoFar !== expectedLength)
			throw new BodyReaderError('Length mismatch')

		try {
			return parser(Buffer.concat(chunks).toString())
		}
		catch (_) {
			throw new BodyReaderError('Could not parse')
		}
	}
}

export const parseJSON = req =>
	IncomingMessage.prototype.body.call(req, JSON.parse)



export const reControlAndDelChars = /[\x00-\x1f\x7f]/

export function hasControlChars(url) {
	try {
		const decoded = decode(url)
		return !decoded || reControlAndDelChars.test(decoded)
	}
	catch {
		return true
	}
}

export function decode(url) {
	const candidate = decodeURIComponent(url)
	return candidate === decodeURIComponent(candidate)
		? candidate
		: '' // reject multiple encodings
}
