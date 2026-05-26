import { resolve } from 'node:path'
import { lstatSync } from 'node:fs'
import { METHODS } from 'node:http'

import { logger } from './utils/logger.js'
import { registerMimes } from './utils/mime.js'
import { openInBrowser } from './utils/openInBrowser.js'
import { is, validate, isInt, isFloat, isOneOf, optionalURL } from './utils/validate.js'
import { validateCorsAllowedMethods, validateCorsAllowedOrigins } from './utils/http-cors.js'

import { jsToJsonPlugin } from './MockDispatcherPlugins.js'

/** @type {{
 * 	[K in keyof Config]-?: [
 * 		defaultVal: Config[K],
 * 		validator: (val: unknown) => err:string
 * 	]
 * }} */
const schema = {
	mocksDir: [resolve('mockaton-mocks'), p => !lstatSync(p).isDirectory()],
	ignore: [/(\.DS_Store|~)$/, is(RegExp)],
	readOnly: [true, is(Boolean)],
	watcherEnabled: [true, is(Boolean)],
	watcherDebounceMs: [80, isInt(0, 5000)],

	host: ['127.0.0.1', is(String)],
	port: [0, isInt(0, 2 ** 16 - 1)], // 0 means auto-assigned

	logLevel: ['normal', isOneOf('normal', 'quiet', 'verbose')],

	delay: [1200, isInt(0, 120_000)],
	delayJitter: [0, isFloat(0, 3)],

	proxyFallback: ['', optionalURL], // e.g. http://localhost:9999
	collectProxied: [false, is(Boolean)],
	formatCollectedJSON: [true, is(Boolean)],

	cookies: [{}, is(Object)], // defaults to the first kv
	extraHeaders: [[], is(Array)],
	extraMimes: [{}, is(Object)],

	corsAllowed: [true, is(Boolean)],
	corsOrigins: [['*'], validateCorsAllowedOrigins],
	corsMethods: [METHODS, validateCorsAllowedMethods],
	corsHeaders: [['content-type', 'authorization'], is(Array)],
	corsExposedHeaders: [[], is(Array)],
	corsCredentials: [true, is(Boolean)],
	corsMaxAge: [0, is(Number)],

	plugins: [
		[
			[/\.(js|ts)$/, jsToJsonPlugin]
		], is(Array)],

	onReady: [await openInBrowser, is(Function)],

	hotReload: [false, is(Boolean)],
	bypassImportCache: [true, is(Boolean)]
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
	if (opts.mocksDir)
		opts.mocksDir = resolve(opts.mocksDir)

	Object.assign(config, opts)
	validate(config, ConfigValidator)
	logger.setLevel(config.logLevel)
	registerMimes(config.extraMimes)
}

export const isFileAllowed = f => !config.ignore.test(f)

export const calcDelay = () => config.delayJitter
	? config.delay * (1 + Math.random() * config.delayJitter)
	: config.delay
