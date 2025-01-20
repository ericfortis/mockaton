import { join } from 'node:path'
import { config } from './config.js'
import { isDirectory, isFile } from './utils/fs.js'
import { sendFile, sendPartialContent, sendNotFound } from './utils/http-response.js'


export function isStatic(req) {
	if (!config.staticDir)
		return false

	const f = resolvePath(req.url)
	return !config.ignore.test(f) // TESTME
		&& Boolean(f)
}

export async function dispatchStatic(req, response) {
	const file = resolvePath(req.url)
	if (!file)
		sendNotFound(response)
	else if (req.headers.range)
		await sendPartialContent(response, req.headers.range, file)
	else
		sendFile(response, file)
}

function resolvePath(url) {
	let candidate = join(config.staticDir, url)
	if (isDirectory(candidate))
		candidate += '/index.html'
	if (isFile(candidate))
		return candidate
}


