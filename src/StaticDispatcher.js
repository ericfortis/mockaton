import { join } from 'node:path'
import { Config } from './Config.js'
import { isDirectory, isFile } from './utils/fs.js'
import { sendFile, sendPartialContent, sendNotFound } from './utils/http-response.js'


export function isStatic(req) {
	return Config.staticDir && resolvePath(req)
}

export async function dispatchStatic(req, response) {
	const file = resolvePath(req)
	if (!file)
		sendNotFound(response)
	else if (req.headers.range)
		await sendPartialContent(response, req.headers.range, file)
	else
		sendFile(response, file)
}

function resolvePath(req) {
	let candidate = join(Config.staticDir, req.url)
	if (isDirectory(candidate))
		candidate += '/index.html'
	if (isFile(candidate))
		return candidate
}


