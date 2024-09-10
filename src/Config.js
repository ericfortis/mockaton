import { openInBrowser } from './utils/openInBrowser.js'
import { validate, is, optional } from './utils/validate.js'
import { isDirectory } from './utils/fs.js'


export const Config = {
	mocksDir: '',
	staticDir: '',
	host: '127.0.0.1',
	port: 0, // auto-assigned
	delay: 1200, // milliseconds
	cookies: {}, // defaults to the first kv
	onReady: openInBrowser,
	proxyFallback: '', // e.g. http://localhost:9999
	extraHeaders: []
}

export function setup(options) {
	Object.assign(Config, options)
	validate(Config, {
		mocksDir: isDirectory,
		staticDir: optional(isDirectory),
		host: is(String),
		port: port => Number.isInteger(port) && port >= 0 && port < 2 ** 16,
		delay: ms => Number.isInteger(ms) && ms > 0,
		cookies: is(Object),
		onReady: is(Function),
		proxyFallback: optional(URL.canParse),
		extraHeaders: Array.isArray
	})
}


