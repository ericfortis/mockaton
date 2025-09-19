import { join } from 'node:path'
import { readFileSync } from 'node:fs'

import { logger } from './utils/logger.js'
import { mimeFor } from './utils/mime.js'
import { brokerByRoute } from './staticCollection.js'
import { config, calcDelay } from './config.js'
import { sendNotFound, sendPartialContent } from './utils/http-response.js'


export async function dispatchStatic(req, response) {
	const broker = brokerByRoute(req.url)

	setTimeout(async () => {
		if (!broker || broker.status === 404) { // TESTME
			logger.accessMock(req.url, 'static404')
			sendNotFound(response)
			return
		}

		logger.accessMock(req.url, 'static200')

		const file = join(config.staticDir, broker.route)
		if (req.headers.range)
			await sendPartialContent(response, req.headers.range, file)
		else {
			response.setHeader('Content-Type', mimeFor(file))
			response.end(readFileSync(file))
		}
	}, Number(broker.delayed && calcDelay()))
}
