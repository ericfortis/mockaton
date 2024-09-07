import { existsSync as exists, lstatSync } from 'node:fs'
import { validate, is, optional } from './utils/validate.js'


export const Config = {
	mocksDir: '',
	staticDir: '',
	host: '127.0.0.1',
	port: 0, // auto-assigned
	delay: 1200, // milliseconds
	cookies: {}, // defaults to the first kv
	skipOpen: false,
	proxyFallback: '', // e.g. http://localhost:9999
	allowedExt: /\.(json|txt|md|js)$/, // Just for excluding temporary editor files (e.g. JetBrains appends a ~)
	generate500: false,
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
		skipOpen: is(Boolean),
		proxyFallback: optional(URL.canParse),
		allowedExt: is(RegExp),
		generate500: is(Boolean),
		extraHeaders: Array.isArray
	})
}

function isDirectory(dir) {
	return exists(dir) && lstatSync(dir).isDirectory()
}


