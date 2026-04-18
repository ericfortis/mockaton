#!/usr/bin/env node

import { resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { isFile } from './utils/fs.js'
import { Mockaton } from '../../index.js'

import pkgJSON from '../../package.json' with { type: 'json' }


process.on('unhandledRejection', error => { throw error })

let args, positionals
try {
	const result = parseArgs({
		options: {
			config: { short: 'c', type: 'string' },

			port: { short: 'p', type: 'string' },
			host: { short: 'H', type: 'string' },

			quiet: { short: 'q', type: 'boolean' },
			'no-open': { short: 'n', type: 'boolean' },

			help: { short: 'h', type: 'boolean' },
			version: { short: 'v', type: 'boolean' }
		},
		allowPositionals: true
	})
	args = result.values
	positionals = result.positionals
}
catch (error) {
	console.error(error.message)
	process.exit(1)
}

// For clean exit on tests, so we can collect code-coverage
process.on('SIGUSR2', () => process.exit(0))


if (args.version)
	console.log(pkgJSON.version)

else if (args.help)
	console.log(`
Usage: mockaton [mocks-dir] [options]

Options:
  -c, --config <file>  (default: ./mockaton.config.js)
  
  -H, --host <host>    (default: 127.0.0.1)
  -p, --port <port>    (default: 0) which means auto-assigned
  
  -q, --quiet          Show errors only
  --no-open            Don’t open dashboard in a browser
  
  -h, --help
  -v, --version

Notes:
  * mockaton.config.js supports more options, see: https://mockaton.com/config
  * CLI options override their mockaton.config.js counterparts
`.trim())

else if (args.config && !isFile(args.config)) {
	console.error(`Invalid config file: ${args.config}`)
	process.exitCode = 1
}
else {
	const userConf = resolve(args.config ?? 'mockaton.config.js')
	const opts = isFile(userConf)
		? (await import(userConf)).default ?? {}
		: {}

	if (args.host) opts.host = args.host
	if (args.port) opts.port = Number.isNaN(Number(args.port)) ? args.port : Number(args.port)

	if (positionals[0]) opts.mocksDir = positionals[0]

	if (args.quiet) opts.logLevel = 'quiet'
	if (args['no-open']) opts.onReady = () => {}

	try {
		await Mockaton(opts)
	}
	catch (err) {
		console.error(err?.message || err)
		process.exit(1)
	}
}
