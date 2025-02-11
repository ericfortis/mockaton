import { resolve } from 'node:path'
import { isDirectory } from './utils/fs.js'
import { openInBrowser } from './utils/openInBrowser.js'
import { jsToJsonPlugin } from './MockDispatcherPlugins.js'
import { StandardMethods } from './utils/http-request.js'
import { validateCorsAllowedMethods, validateCorsAllowedOrigins } from './utils/http-cors.js'


/** @type {Config} */
export const config = Object.seal({
	mocksDir: '',
	staticDir: '',
	ignore: /(\.DS_Store|~)$/,

	host: '127.0.0.1',
	port: 0, // auto-assigned
	proxyFallback: '', // e.g. http://localhost:9999
	collectProxied: false,

	delay: 1200, // milliseconds
	cookies: {}, // defaults to the first kv
	extraHeaders: [],
	extraMimes: {},

	plugins: [
		[/\.(js|ts)$/, jsToJsonPlugin]
	],

	corsAllowed: true,
	corsOrigins: ['*'],
	corsMethods: StandardMethods,
	corsHeaders: ['content-type'],
	corsExposedHeaders: [],
	corsCredentials: true,
	corsMaxAge: 0,

	onReady: openInBrowser
})


export function setup(options) {
	Object.assign(config, options)
	validate(config, {
		mocksDir: isDirectory,
		staticDir: optional(isDirectory),
		ignore: is(RegExp),

		host: is(String),
		port: port => Number.isInteger(port) && port >= 0 && port < 2 ** 16,
		proxyFallback: optional(URL.canParse),
		collectProxied: is(Boolean),

		delay: ms => Number.isInteger(ms) && ms > 0,
		cookies: is(Object),
		extraHeaders: val => Array.isArray(val) && val.length % 2 === 0,
		extraMimes: is(Object),

		plugins: Array.isArray,

		corsAllowed: is(Boolean),
		corsOrigins: validateCorsAllowedOrigins,
		corsMethods: validateCorsAllowedMethods,
		corsHeaders: Array.isArray,
		corsExposedHeaders: Array.isArray,
		corsCredentials: is(Boolean),
		corsMaxAge: is(Number),

		onReady: is(Function)
	})

	config.mocksDir = resolve(config.mocksDir)
	config.staticDir = resolve(config.staticDir)
}


function validate(obj, shape) {
	for (const [field, value] of Object.entries(obj))
		if (!shape[field](value))
			throw new TypeError(`config.${field}=${JSON.stringify(value)} is invalid`)
}

function is(ctor) {
	return val => val.constructor === ctor
}

function optional(tester) {
	return val => !val || tester(val)
}
