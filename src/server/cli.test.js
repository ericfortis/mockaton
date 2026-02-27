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
				'--no-open'
			])

			// Collect stdout and stderr until we find the Listening line
			const output = await new Promise((resolve, reject) => {
				let stdout = ''
				let stderr = ''
				const timeout = setTimeout(() => {
					reject(new Error(`Timeout waiting for server to start\nstdout: ${stdout}\nstderr: ${stderr}`))
				}, 5000)

				serverProcess.stdout.on('data', (data) => {
					stdout += data.toString()
					if (stdout.includes('Listening::')) {
						clearTimeout(timeout)
						resolve(stdout)
					}
				})

				serverProcess.stderr.on('data', (data) => {
					stderr += data.toString()
					if (stderr.includes('Listening::')) {
						clearTimeout(timeout)
						resolve(stderr)
					}
				})

				serverProcess.on('error', (err) => {
					clearTimeout(timeout)
					reject(err)
				})

				serverProcess.on('exit', (code) => {
					clearTimeout(timeout)
					reject(new Error(`Server exited with code ${code}\nstdout: ${stdout}\nstderr: ${stderr}`))
				})
			})

			const addrMatch = output.match(/Listening::(http:\/\/[^\s\n]+)/)
			if (!addrMatch) {
				throw new Error(`Expected to find "Listening::" in output, got:\n${output}`)
			}

			const addr = addrMatch[1]
			equal(addr.startsWith('http://'), true, `Expected address to start with http://, got: ${addr}`)
		})
	})
})
