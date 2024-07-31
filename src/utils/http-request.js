export class JsonBodyParserError extends Error {}

export function parseJSON(req) {
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
				reject(new JsonBodyParserError())
			else
				try {
					resolve(JSON.parse(Buffer.concat(body).toString()))
				}
				catch (_) {
					reject(new JsonBodyParserError())
				}
		}
	})
}