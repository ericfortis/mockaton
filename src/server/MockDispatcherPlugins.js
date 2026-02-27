import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { mimeFor } from './utils/mime.js'

export function echoFilePlugin(filePath) {
	return {
		mime: mimeFor(filePath),
		body: readFileSync(filePath)
	}
}

export async function jsToJsonPlugin(filePath, req, response) {
	const jsExport = (await import(pathToFileURL(filePath))).default
	const body = typeof jsExport === 'function'
		? await jsExport(req, response)
		: JSON.stringify(jsExport, null, 2)
	return {
		mime: response.getHeader('Content-Type') || mimeFor('.json'), // js functions are allowed to set it
		body
	}
}
