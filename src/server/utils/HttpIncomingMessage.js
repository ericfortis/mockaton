import http, { METHODS } from 'node:http'


export const methodIsSupported = method => METHODS.includes(method)

export class BodyReaderError extends Error {
	name = 'BodyReaderError'
	constructor(msg) {
		super()
		this.message = msg
	}
}

export class IncomingMessage extends http.IncomingMessage {
	json() {
		return readBody(this, JSON.parse)
	}
}

export const parseJSON = req => readBody(req, JSON.parse)

export function readBody(req, parser = a => a) {
	return new Promise((resolve, reject) => {
		const MAX_BODY_SIZE = 200 * 1024
		const expectedLength = req.headers['content-length'] | 0
		let lengthSoFar = 0
		const body = []
		req.on('data', onData)
		req.on('end', onEnd)
		req.on('error', onEnd)

		function onData(chunk) {
			lengthSoFar += chunk.length
			if (lengthSoFar > MAX_BODY_SIZE)
				onEnd()
			else
				body.push(chunk)
		}

		function onEnd() {
			req.removeListener('data', onData)
			req.removeListener('end', onEnd)
			req.removeListener('error', onEnd)
			if (lengthSoFar !== expectedLength)
				reject(new BodyReaderError('Length mismatch'))
			else
				try {
					resolve(parser(Buffer.concat(body).toString()))
				}
				catch (_) {
					reject(new BodyReaderError('Could not parse'))
				}
		}
	})
}

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

