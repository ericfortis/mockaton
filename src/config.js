import { realpathSync } from 'node:fs'
import { isDirectory } from './utils/fs.js'
import { openInBrowser } from './utils/openInBrowser.js'
import { jsToJsonPlugin } from './MockDispatcherPlugins.js'
import { optional, is, validate } from './utils/validate.js'
import { SUPPORTED_METHODS } from './utils/http-request.js'
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
	formatCollectedJSON: true,

	delay: 1200, // milliseconds

	cookies: {}, // defaults to the first kv

	extraHeaders: [],

	extraMimes: {},

	plugins: [
		[/\.(js|ts)$/, jsToJsonPlugin]
	],

	corsAllowed: true,
	corsOrigins: ['*'],
	corsMethods: SUPPORTED_METHODS,
	corsHeaders: ['content-type'],
	corsExposedHeaders: [],
	corsCredentials: true,
	corsMaxAge: 0,

	onReady: await openInBrowser
})


export const fileIsAllowed = f => !config.ignore.test(f)


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
		formatCollectedJSON: is(Boolean),

		delay: ms => Number.isInteger(ms) && ms >= 0,

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

	config.mocksDir = realpathSync(config.mocksDir)
	if (config.staticDir)
		config.staticDir = realpathSync(config.staticDir)
}
