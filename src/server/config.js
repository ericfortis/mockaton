import { resolve } from 'node:path'

import { logger } from './utils/logger.js'
import { isDirectory } from './utils/fs.js'
import { openInBrowser } from './utils/openInBrowser.js'
import { optional, is, validate } from './utils/validate.js'
import { SUPPORTED_METHODS } from './utils/http-request.js'
import { validateCorsAllowedMethods, validateCorsAllowedOrigins } from './utils/http-cors.js'

import { jsToJsonPlugin } from './MockDispatcher.js'


/** @type {{
 * 	[K in keyof Config]-?: [
 * 		defaultVal: Config[K],
 * 		validator: (val: unknown) => boolean
 * 	]
 * }} */
const schema = {
	mocksDir: [resolve('mockaton-mocks'), isDirectory],
	staticDir: [resolve('mockaton-static-mocks'), optional(isDirectory)],
	ignore: [/(\.DS_Store|~)$/, is(RegExp)],
	watcherEnabled: [true, is(Boolean)],

	host: ['127.0.0.1', is(String)],
	port: [0, port => Number.isInteger(port) && port >= 0 && port < 2 ** 16], // 0 means auto-assigned

	logLevel: ['normal', val => ['normal', 'quiet', 'verbose'].includes(val)],

	delay: [1200, ms => Number.isInteger(ms) && ms >= 0],
	delayJitter: [0, percent => percent >= 0 && percent <= 3],

	proxyFallback: ['', optional(URL.canParse)], // e.g. http://localhost:9999
	collectProxied: [false, is(Boolean)],
	formatCollectedJSON: [true, is(Boolean)],

	cookies: [{}, is(Object)], // defaults to the first kv
	extraHeaders: [[], val => Array.isArray(val) && val.length % 2 === 0],
	extraMimes: [{}, is(Object)],

	corsAllowed: [true, is(Boolean)],
	corsOrigins: [['*'], validateCorsAllowedOrigins],
	corsMethods: [SUPPORTED_METHODS, validateCorsAllowedMethods],
	corsHeaders: [['content-type', 'authorization'], Array.isArray],
	corsExposedHeaders: [[], Array.isArray],
	corsCredentials: [true, is(Boolean)],
	corsMaxAge: [0, is(Number)],

	plugins: [
		[
			[/\.(js|ts)$/, jsToJsonPlugin]
		], Array.isArray],

	onReady: [await openInBrowser, is(Function)],

	hotReload: [false, is(Boolean)]
}


const defaults = {}
const validators = {}
for (const [k, [defaultVal, validator]] of Object.entries(schema)) {
	defaults[k] = defaultVal
	validators[k] = validator
}

/** @type Config */
export const config = Object.seal(defaults)

/** @type {Record<keyof Config, (val: unknown) => val is Config[keyof Config]>} */
export const ConfigValidator = Object.freeze(validators)


/** @param {Partial<Config>} opts */
export function setup(opts) {
	if (process.env.NODE_ENV !== 'development')
		opts.hotReload = false
	
	if (opts.mocksDir)
		opts.mocksDir = resolve(opts.mocksDir)

	if (opts.staticDir)
		opts.staticDir = resolve(opts.staticDir)
	else if (!isDirectory(defaults.staticDir))
		opts.staticDir = ''

	Object.assign(config, opts)
	validate(config, ConfigValidator)
	logger.setLevel(config.logLevel)
}

export const isFileAllowed = f => !config.ignore.test(f)

export const calcDelay = () => config.delayJitter
	? config.delay * (1 + Math.random() * config.delayJitter)
	: config.delay
