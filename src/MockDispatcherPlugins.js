import { readFileSync as read } from 'node:fs'
import { mimeFor } from './utils/mime.js'
import { Config } from './Config.js'


const plugins = {
	'.js': jsToJsonPlugin,
	'.ts': jsToJsonPlugin
}

export async function preprocessPlugins(filePath, req, response) {
	for (const [ext, plugin] of Object.entries({ ...plugins, ...Config.plugins }))
		if (filePath.endsWith(ext))
			return await plugin(filePath, req, response)
	return defaultPlugin(filePath)
}

export function defaultPlugin(filePath) {
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
