import { join } from 'node:path'
import { equal } from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { describe, test } from 'node:test'

import pkgJSON from '../../package.json' with { type: 'json' }


const rel = f => join(import.meta.dirname, f)
const cli = (...args) => spawnSync(rel('cli.js'), args, { encoding: 'utf8' })

describe('CLI', () => {
	test('invalid flag', () => {
		const { stderr, status } = cli('--invalid-flag')
		equal(stderr.trim(), `Unknown option '--invalid-flag'`)
		equal(status, 1)
	})

	test('invalid config file', () => {
		const { stderr, status } = cli('--config', 'non-existing-file.js')
		equal(stderr.trim(), `Invalid config file: non-existing-file.js`)
		equal(status, 1)
	})

	test('invalid port', () => {
		const { stderr, status } = cli(
			'--mocks-dir', rel('../../mockaton-mocks'),
			'--port', 'not-a-number',
		)
		equal(stderr.trim(), `port="not-a-number" is invalid`)
		equal(status, 1)
	})

	test('-v outputs version from package.json', () => {
		const { stdout, status } = cli('-v')
		equal(stdout.trim(), pkgJSON.version)
		equal(status, 0)
	})

	test('-h outputs usage message', () => {
		const { stdout, status } = cli('-h')
		equal(stdout.split('\n')[0], 'Usage: mockaton [options]')
		equal(status, 0)
	})

	// Mockaton.test.js tests the remaining cli branch
})

