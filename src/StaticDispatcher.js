import { join } from 'node:path'
import { existsSync as exists, lstatSync as lstat } from 'node:fs'

import { Config } from './Config.js'
import { sendFile, sendPartialContent } from './utils/http-response.js'


export function isStatic(req) {
	return Config.staticDir && exists(resolvePath(req))
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
	if (exists(candidate))
		return lstat(candidate).isDirectory()
			? candidate + '/index.html'
			: candidate
}


