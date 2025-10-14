import { join } from 'node:path'
import { readFileSync } from 'node:fs'

import { logger } from './utils/logger.js'
import { mimeFor } from './utils/mime.js'
import { brokerByRoute } from './staticCollection.js'
import { config, calcDelay } from './config.js'
import { sendMockNotFound, sendPartialContent } from './utils/http-response.js'
import { execFileSync } from 'node:child_process'
import { isFile } from './utils/fs.js'


export async function dispatchStatic(req, response) {
	const broker = brokerByRoute(req.url)

	setTimeout(async () => {
		if (!broker || broker.status === 404) { // TESTME
			sendMockNotFound(response)
			return
		}

		const file = join(config.staticDir, broker.route)
		if (!isFile(file)) {
			sendMockNotFound(response) // TESTME
			return
		}
		
		logger.accessMock(req.url, 'static200')
		if (req.headers.range)
			await sendPartialContent(response, req.headers.range, file)
		else {
			response.setHeader('Content-Type', mimeFor(file))
			response.end(readFileSync(file))
		}
	}, Number(broker.delayed && calcDelay()))
}
