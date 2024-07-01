import { existsSync, lstatSync } from 'node:fs'
import { validate } from './utils/validate.js'


export const Config = {
	mocksDir: '',
	staticDir: '',
	host: '127.0.0.1',
	port: 0, // auto-assigned
	delay: 1200, // milliseconds
	cookies: {}, // defaults to the first kv
	database: {},
	skipOpen: false, // Prevents opening the dashboard in a browser
	allowedExt: /\.(json|txt|md|mjs)$/ // Just for excluding temporary editor files (e.g. JetBrains appends a ~)
}

export function setup(options) {
	Object.assign(Config, options)
	validate(Config, {
		mocksDir: isDirectory,
		staticDir: optional(isDirectory),
		host: String,
		port: port => Number.isInteger(port) && port >= 0 && port < 2 ** 16,
		delay: ms => Number.isInteger(ms) && ms > 0,
		cookies: Object,
		database: Object,
		skipOpen: Boolean,
		allowedExt: RegExp
	})
}


function optional(tester) {
	return val => !val || tester(val)
}

function isDirectory(dir) {
	return existsSync(dir) && lstatSync(dir).isDirectory()
}


