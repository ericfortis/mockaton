import { join } from 'node:path'

import { logger } from './utils/logger.js'

import { proxy } from './ProxyRelay.js'
import { cookie } from './cookie.js'
import { parseFilename } from '../client/Filename.js'
import { echoFilePlugin } from './MockDispatcherPlugins.js'
import { brokerByRoute } from './mockBrokersCollection.js'
import { config, calcDelay } from './config.js'


export async function dispatchMock(req, response) {
	try {
		const isHead = req.method === 'HEAD'

		let broker = brokerByRoute(req.method, req.url)
		if (!broker && isHead)
			broker = brokerByRoute('GET', req.url)

		if (config.proxyFallback && (!broker || broker.proxied)) {
			await proxy(req, response, broker?.delayed ? calcDelay() : 0)
			return
		}
		if (!broker) {
			response.mockNotFound()
			return
		}

		if (cookie.getCurrent())
			response.setHeader('Set-Cookie', cookie.getCurrent())

		const { isStatic } = parseFilename(broker.file)

		if (isStatic && req.headers.range && !broker.autoStatus) {
			setTimeout(async () => {
				await response.partialContent(req.headers.range, join(config.mocksDir, broker.file))
			}, Number(broker.delayed && calcDelay()))
			logger.accessMock(req.url, broker.file)
			return
		}

		response.statusCode = broker.autoStatus
			? broker.autoStatus
			: broker.status

		const { mime, body } = broker.autoStatus
			? { mime: '', body: '' }
			: isStatic
				? echoFilePlugin(join(config.mocksDir, broker.file))
				: await applyPlugins(join(config.mocksDir, broker.file), req, response)

		response.setHeader('Content-Type', mime)
		response.setHeader('Content-Length', length(body))

		setTimeout(() =>
			response.end(isHead
				? null
				: body
			), Number(broker.delayed && calcDelay()))

		logger.accessMock(req.url, broker.file)
	}
	catch (error) { // TESTME
		if (error?.code === 'ENOENT') // mock-file has been deleted
			response.mockNotFound()
		else
			response.internalServerError(error)
	}
}

async function applyPlugins(filePath, req, response) {
	for (const [regex, plugin] of config.plugins)
		if (regex.test(filePath))
			return await plugin(filePath, req, response)
	return echoFilePlugin(filePath)
}

function length(body) {
	if (typeof body === 'string') return Buffer.byteLength(body)
	if (body instanceof Uint8Array) return body.byteLength // Buffers are u8
	return 0
}
