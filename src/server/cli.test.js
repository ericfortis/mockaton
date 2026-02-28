import { join } from 'node:path'
import { equal } from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { mkdtempSync } from 'node:fs'
import { describe, test } from 'node:test'
import { spawn, spawnSync } from 'node:child_process'

import pkgJSON from '../../package.json' with { type: 'json' }


const CLI_PATH = join(import.meta.dirname, 'cli.js')
const cli = args => spawnSync(CLI_PATH, args, { encoding: 'utf8' })
const cliAsync = args => spawn(CLI_PATH, args)


describe('CLI', () => {
	test('-v outputs version from package.json', () => {
		const { stdout, status } = cli(['-v'])
		equal(stdout.trim(), pkgJSON.version)
		equal(status, 0)
	})

	test('-h outputs usage message', () => {
		const { stdout, status } = cli(['-h'])
		equal(stdout.split('\n')[0], 'Usage: mockaton [options]')
		equal(status, 0)
	})

	test('outputs listening address', async () => {
		const proc = cliAsync([
			'--mocks-dir', mkdtempSync(join(tmpdir(), 'mocks')),
			'--no-open'
		])

		let stdout = ''
		await new Promise((resolve, reject) => {
			proc.on('error', reject)
			proc.stdout.on('data', data => {
				stdout = data.toString()
				resolve()
			})
		})

		const addr = stdout.match(/Listening::(http:\/\/[^\s\n]+)/)[1]
		equal(addr.startsWith('http://'), true, `Expected address to start with http://, got: ${addr}`)
		proc.kill()
	})
})
