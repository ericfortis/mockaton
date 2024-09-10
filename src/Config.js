import { openInBrowser } from './utils/openInBrowser.js'
import { validate, is, optional } from './utils/validate.js'
import { isDirectory } from './utils/fs.js'


export const Config = {
	mocksDir: '',
	ignore: /(\.DS_Store|~)$/,

	staticDir: '',

	host: '127.0.0.1',
	port: 0, // auto-assigned
	proxyFallback: '', // e.g. http://localhost:9999

	delay: 1200, // milliseconds
	cookies: {}, // defaults to the first kv
	extraHeaders: [],
	extraMimes: {},

	onReady: openInBrowser
}

export function setup(options) {
	Object.assign(Config, options)
	validate(Config, {
		mocksDir: isDirectory,
		ignore: is(RegExp),

		staticDir: optional(isDirectory),

		host: is(String),
		port: port => Number.isInteger(port) && port >= 0 && port < 2 ** 16,
		proxyFallback: optional(URL.canParse),

		delay: ms => Number.isInteger(ms) && ms > 0,
		cookies: is(Object),
		extraHeaders: Array.isArray,
		extraMimes: is(Object),

		onReady: is(Function)
	})
}


