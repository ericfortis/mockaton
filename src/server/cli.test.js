import { join } from 'node:path'
import { equal } from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { describe, test } from 'node:test'

import pkgJSON from '../../package.json' with { type: 'json' }


function cli(args, timeout) {
	return spawnSync(join(import.meta.dirname, 'cli.js'), args, {
		timeout,
		encoding: 'utf8'
	})
}

describe('CLI', () => {
	test('--invalid-flag', () => {
		const { stderr, status } = cli(['--invalid-flag'])
		equal(stderr.trim(), `Unknown option '--invalid-flag'`)
		equal(status, 1)
	})

	test('invalid config file', () => {
		const { stderr, status } = cli(['--config', 'non-existing-file.js'])
		equal(stderr.trim(), `Invalid config file: non-existing-file.js`)
		equal(status, 1)
	})

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

	test('outputs listening address', () => {
		const { stdout } = cli([
			'--mocks-dir', mkdtempSync(join(tmpdir(), 'mocks')),
			'--no-open'
		], 100)
		const addr = stdout.match(/Listening::(http:\/\/[^\s\n]+)/)?.[1]
		equal(addr.startsWith('http://'), true, `Expected address to start with http://, got: ${addr}`)
	})
})
