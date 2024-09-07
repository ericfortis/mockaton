import { exec } from 'node:child_process'


export function openInBrowser(address) {
	if (process.platform === 'darwin')
		exec(`open ${address}`)
}

