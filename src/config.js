import { realpathSync } from 'node:fs'
import { isDirectory } from './utils/fs.js'
import { openInBrowser } from './utils/openInBrowser.js'
import { jsToJsonPlugin } from './MockDispatcherPlugins.js'
import { optional, is, validate } from './utils/validate.js'
import { SUPPORTED_METHODS } from './utils/http-request.js'
import { validateCorsAllowedMethods, validateCorsAllowedOrigins } from './utils/http-cors.js'


/** @type {{
 * 	[K in keyof Config]-?: [
 * 		defaultVal: Config[K],
 * 		validator: (val: unknown) => boolean
 * 	]
 * }} */
const schema = {
	mocksDir: ['', isDirectory],
	staticDir: ['', optional(isDirectory)],
	ignore: [/(\.DS_Store|~)$/, is(RegExp)],

	host: ['127.0.0.1', is(String)],
	port: [0, port => Number.isInteger(port) && port >= 0 && port < 2 ** 16], // 0 means auto-assigned

	proxyFallback: ['', optional(URL.canParse)], // e.g. http://localhost:9999
	collectProxied: [false, is(Boolean)],
	formatCollectedJSON: [true, is(Boolean)],

	delay: [1200, ms => Number.isInteger(ms) && ms >= 0],

	cookies: [{}, is(Object)], // defaults to the first kv

	extraHeaders: [[], val => Array.isArray(val) && val.length % 2 === 0],

	extraMimes: [{}, is(Object)],

	plugins: [
		[
			[/\.(js|ts)$/, jsToJsonPlugin]
		], Array.isArray],

	corsAllowed: [true, is(Boolean)],
	corsOrigins: [['*'], validateCorsAllowedOrigins],
	corsMethods: [SUPPORTED_METHODS, validateCorsAllowedMethods],
	corsHeaders: [['content-type'], Array.isArray],
	corsExposedHeaders: [[], Array.isArray],
	corsCredentials: [true, is(Boolean)],
	corsMaxAge: [0, is(Number)],

	onReady: [await openInBrowser, is(Function)]
}


const ConfigDefaults = {}

/** @type {Record<keyof Config, (val: unknown) => boolean>} */
export const ConfigValidators = {}

for (const [k, [defaultVal, validator]] of Object.entries(schema)) {
	ConfigDefaults[k] = defaultVal
	ConfigValidators[k] = validator
}


/** @type {Config} */
export const config = Object.seal(ConfigDefaults)

export const filenameIsNotIgnored = f => !config.ignore.test(f)

export function setup(options) {
	Object.assign(config, options)
	validate(config, ConfigValidators)

	config.mocksDir = realpathSync(config.mocksDir)
	if (config.staticDir)
		config.staticDir = realpathSync(config.staticDir)
}
