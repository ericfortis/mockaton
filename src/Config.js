import { isDirectory } from './utils/fs.js'
import { openInBrowser } from './utils/openInBrowser.js'
import { StandardMethods } from './utils/http-request.js'
import { validate, is, optional } from './utils/validate.js'


export const Config = Object.seal({
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
		extraHeaders: val => Array.isArray(val) && val.length % 2 === 0,
		extraMimes: is(Object),

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


function validateCorsAllowedOrigins(arr) {
	if (!Array.isArray(arr))
		return false

	if (arr.length === 1 && arr[0] === '*')
		return true

	return arr.every(o => URL.canParse(o))
}


function validateCorsAllowedMethods(arr) {
	if (!Array.isArray(arr))
		return false

	return arr.every(m => StandardMethods.includes(m))
}
