import { isDirectory } from './utils/fs.js'
import { openInBrowser } from './utils/openInBrowser.js'
import { jsToJsonPlugin } from './MockDispatcherPlugins.js'
import { StandardMethods } from './utils/http-request.js'
import { validate, is, optional } from './utils/validate.js'
import { validateCorsAllowedMethods, validateCorsAllowedOrigins } from './utils/http-cors.js'


export const config = Object.seal({
	mocksDir: '',
	ignore: /(\.DS_Store|~)$/,

	staticDir: '',

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

	corsAllowed: false,
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
		ignore: is(RegExp),

		staticDir: optional(isDirectory),

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
}
