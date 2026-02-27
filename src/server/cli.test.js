import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { equal, match } from 'node:assert/strict'
import { describe, test, after } from 'node:test'

import pkgJSON from '../../package.json' with { type: 'json' }


// Path to the CLI script
const CLI_PATH = new URL('./cli.js', import.meta.url).pathname

// Helper to spawn the CLI process
function spawnCli(args, opts = {}) {
	const result = spawnSync('node', [CLI_PATH, ...args], {
		encoding: 'utf8',
		...opts
	})
	return {
		stdout: result.stdout || '',
		stderr: result.stderr || '',
		status: result.status
	}
}


await describe('CLI', async () => {
	await describe('Version flag (-v)', async () => {
		await test('outputs version from package.json', () => {
			const { stdout, status } = spawnCli(['-v'])
			equal(stdout.trim(), pkgJSON.version)
			equal(status, 0)
		})
	})

	await describe('Help flag (-h)', async () => {
		await test('outputs usage message', () => {
			const { stdout, status } = spawnCli(['-h'])
			const firstLine = stdout.split('\n')[0]
			equal(firstLine, 'Usage: mockaton [options]')
			equal(status, 0)
		})
	})

	await describe('Server startup', async () => {
		const tempMocksDir = mkdtempSync(join(tmpdir(), 'mocks'))

		after(() => {
			rmSync(tempMocksDir, { recursive: true, force: true })
		})

		await test('outputs listening address', () => {
			const { stdout, status } = spawnCli([
				'--mocks-dir', tempMocksDir,
				'--no-open',
				'--quiet'
			], { timeout: 5000 })

			const match = stdout.match(/Listening::(http:\/\/[^\s\n]+)/)
			if (!match) {
				throw new Error(`Expected to find "Listening::" in stdout, got:\n${stdout}`)
			}

			const addr = match[1]
			equal(addr.startsWith('http://'), true, `Expected address to start with http://, got: ${addr}`)
			equal(status, 0)
		})
	})
})
