import { readFileSync as read } from 'node:fs'
import { mimeFor } from './utils/mime.js'
import { Config } from './Config.js'


export async function applyPlugins(filePath, req, response) {
	for (const [regex, plugin] of Config.plugins) // TESTME capitalizePlugin
		if (regex.test(filePath))
			return await plugin(filePath, req, response)
	return {
		mime: mimeFor(filePath),
		body: read(filePath)
	}
}

export async function jsToJsonPlugin(filePath, req, response) {
	const jsExport = (await import(filePath + '?' + Date.now())).default // date for cache busting
	const body = typeof jsExport === 'function'
		? await jsExport(req, response)
		: JSON.stringify(jsExport, null, 2)
	return {
		mime: response.getHeader('Content-Type') || mimeFor('.json'), // jsFunc are allowed to set it
		body
	}
}
