import { join } from 'node:path'
import { existsSync, lstatSync } from 'node:fs'

import { Config } from './Config.js'
import { sendFile, sendPartialContent } from './utils/http-response.js'


export function isStatic(req) {
	return Config.staticDir &&
		existsSync(resolvePath(req))
}

export async function dispatchStatic(req, response) {
	const file = resolvePath(req)
	if (req.headers.range)
		await sendPartialContent(response, req.headers.range, file)
	else
		sendFile(response, file)
}

function resolvePath(req) {
	const candidate = join(Config.staticDir, req.url)
	if (existsSync(candidate))
		return lstatSync(candidate).isDirectory()
			? candidate + '/index.html'
			: candidate
}


