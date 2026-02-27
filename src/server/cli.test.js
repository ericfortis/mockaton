import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync, rmSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { equal, match } from 'node:assert/strict'
import { describe, test, after } from 'node:test'

import pkgJSON from '../../package.json' with { type: 'json' }


// Path to the CLI script
const CLI_PATH = new URL('./cli.js', import.meta.url).pathname

// Helper to spawn the CLI process (for quick exit commands)
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

// Helper to spawn the CLI server (for long-running process)
function spawnCliServer(args) {
	return spawn('node', [CLI_PATH, ...args], {
		encoding: 'utf8'
	})
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
		let serverProcess = null

		after(() => {
			if (serverProcess) {
				serverProcess.kill()
			}
			rmSync(tempMocksDir, { recursive: true, force: true })
		})

		await test('outputs listening address', async () => {
			serverProcess = spawnCliServer([
				'--mocks-dir', tempMocksDir,
				'--no-open',
				'--quiet'
			])

			// Collect stdout until we find the Listening line
			const stdout = await new Promise((resolve, reject) => {
				let output = ''
				const timeout = setTimeout(() => {
					reject(new Error('Timeout waiting for server to start'))
				}, 5000)

				serverProcess.stdout.on('data', (data) => {
					output += data.toString()
					if (output.includes('Listening::')) {
						clearTimeout(timeout)
						resolve(output)
					}
				})

				serverProcess.stderr.on('data', (data) => {
					console.error('Server stderr:', data.toString())
				})

				serverProcess.on('error', (err) => {
					clearTimeout(timeout)
					reject(err)
				})
			})

			const addrMatch = stdout.match(/Listening::(http:\/\/[^\s\n]+)/)
			if (!addrMatch) {
				throw new Error(`Expected to find "Listening::" in stdout, got:\n${stdout}`)
			}

			const addr = addrMatch[1]
			equal(addr.startsWith('http://'), true, `Expected address to start with http://, got: ${addr}`)
		})
	})
})
