#!/usr/bin/env node

import { pathToFileURL } from 'node:url'
import { resolve, join } from 'node:path'
import { parseArgs } from 'node:util'

import { config } from './config.js'
import { isFile, isDirectory } from './utils/fs.js'
import { Mockaton } from '../../index.js'
import pkgJSON from '../../package.json' with { type: 'json' }


const DEFAULT_CONFIG_FILE = 'mockaton.config.js'
const SKILLS_PATH = join(import.meta.dirname, '../../skills/mockaton/SKILL.md')

const HELP = `
SYNOPSIS
  mockaton [options] [mocks-dir]

OPTIONS
  -c, --config <file>  (default: ./${DEFAULT_CONFIG_FILE})
 
  -H, --host <host>    (default: ${config.host})
  -p, --port <port>    (default: ${config.port}) 0 means auto-assigned
 
  -q, --quiet          Show errors only
  --no-open            Don't open dashboard in a browser
  --no-read-only       Allow writing and deleting mocks via API
 
  --skills             Show AI agent SKILL.md file path
  -h, --help
  -v, --version

NOTES
  * mockaton.config.js supports more options.
  * CLI options override their ${DEFAULT_CONFIG_FILE} counterparts.
  * https://mockaton.com/config
`.trim()


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
			'no-read-only': { type: 'boolean' },

			help: { short: 'h', type: 'boolean' },
			skills: { type: 'boolean' },
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

process.on('SIGUSR2', () => process.exit(0)) // For clean exit when collecting code-coverage


if (args.version) console.log(pkgJSON.version)
else if (args.help) console.log(HELP)
else if (args.skills) console.log(SKILLS_PATH)
else if (args.config && !isFile(args.config)) {
	console.error(`Invalid config file: ${args.config}`)
	process.exit(1)
}
else {
	const userConf = resolve(args.config ?? DEFAULT_CONFIG_FILE)
	const opts = isFile(userConf)
		? (await import(pathToFileURL(userConf))).default ?? {}
		: {}

	if (args.host) opts.host = args.host
	if (args.port) opts.port = Number.isNaN(Number(args.port)) ? args.port : Number(args.port)

	if (positionals[0]) opts.mocksDir = positionals[0]
	else if (!opts.mocksDir && !isDirectory(config.mocksDir)) {
		console.log(HELP)
		process.exit(0)
	}

	if (args.quiet) opts.logLevel = 'quiet'
	if (args['no-open']) opts.onReady = () => {}
	if (args['no-read-only']) opts.readOnly = false

	try {
		await Mockaton(opts)
	}
	catch (err) {
		console.error(err?.message || err)
		process.exit(1)
	}
}
