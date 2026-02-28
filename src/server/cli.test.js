import { join } from 'node:path'
import { equal } from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { mkdtempSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { describe, test, after } from 'node:test'

import pkgJSON from '../../package.json' with { type: 'json' }


const CLI_PATH = join(import.meta.dirname, 'cli.js')

function spawnCli(args) {
	return spawnSync(CLI_PATH, args, { encoding: 'utf8' })
}

function spawnCliServer(args) {
	return spawn(CLI_PATH, args)
}


describe('CLI', () => {
	test('-v outputs version from package.json', () => {
		const { stdout, status } = spawnCli(['-v'])
		equal(stdout.trim(), pkgJSON.version)
		equal(status, 0)
	})

	test('-h outputs usage message', () => {
		const { stdout, status } = spawnCli(['-h'])
		equal(stdout.split('\n')[0], 'Usage: mockaton [options]')
		equal(status, 0)
	})

	describe('Server startup', () => {
		const tempMocksDir = mkdtempSync(join(tmpdir(), 'mocks'))
		let proc = null

		after(() => proc?.kill())

		test('outputs listening address', async () => {
			proc = spawnCliServer([
				'--mocks-dir', tempMocksDir,
				'--no-open'
			])

			const output = await new Promise((resolve, reject) => {
				proc.on('error', reject)
				
				proc.stdout.on('data', data => {
					const stdout = data.toString()
					if (stdout.includes('Listening::')) 
						resolve(stdout)
				})
			})

			const addr = output.match(/Listening::(http:\/\/[^\s\n]+)/)[1]
			equal(addr.startsWith('http://'), true, `Expected address to start with http://, got: ${addr}`)
		})
	})
})
