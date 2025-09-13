#!/usr/bin/env node

import { join } from 'node:path'
import { parseArgs } from 'node:util'

import { isFile } from './utils/fs.js'
import { Mockaton } from '../index.js'
import pkgJSON from '../package.json' with { type: 'json' }


const args = parseArgs({
	options: {
		config: { short: 'c', type: 'string' },

		port: { short: 'p', type: 'string' },
		host: { short: 'H', type: 'string' },

		'mocks-dir': { short: 'm', type: 'string' },
		'static-dir': { short: 's', type: 'string' },

		quiet: { short: 'q', type: 'boolean' },
		'no-open': { short: 'n', type: 'boolean' },
		
		help: { short: 'h', type: 'boolean' },
		version: { short: 'v', type: 'boolean' },
	}
}).values


if (args.version)
	console.log(pkgJSON.version)

else if (args.help)
	console.log(`
Usage: mockaton [options]

Options:
  -c, --config <file>    (default: ./mockaton.config.js)
  
  -m, --mocks-dir <dir>  (default: ./mockaton-mocks/)
  -s, --static-dir <dir> (default: ./mockaton-static-mocks/)
  
  -H, --host <host>      (default: 127.0.0.1)
  -p, --port <port>      (default: 0) which means auto-assigned
  
  -q, --quiet            Errors only
  --no-open              Don’t open dashboard in a browser (noops onReady callback)
  
  -h, --help             Show this help
  -v, --version          Show version

Notes:
  * mockaton.config.js supports more options, see:
      https://github.com/ericfortis/mockaton?tab=readme-ov-file#mockatonconfigjs-optional
  * CLI options override their mockaton.config.js counterparts`)

else if (args.config && !isFile(args.config)) {
	console.error(`Invalid config file: ${args.config}`)
	process.exitCode = 1
}
else {
	const userConf = join(process.cwd(), args.config ?? 'mockaton.config.js')
	const opts = isFile(userConf)
		? (await import(userConf)).default ?? {}
		: {}

	if (args.host) opts.host = args.host
	if (args.port) opts.port = Number(args.port)

	if (args['mocks-dir']) opts.mocksDir = args['mocks-dir']
	if (args['static-dir']) opts.staticDir = args['static-dir']

	if (args.quiet) opts.logLevel = 'quiet'
	if (args['no-open']) opts.onReady = () => {}

	Mockaton(opts)
}
