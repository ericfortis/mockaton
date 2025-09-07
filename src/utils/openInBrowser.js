import { execFileSync } from 'node:child_process'


export const openInBrowser = (async () => {
	try {
		return (await import('open')).default
	}
	catch (error) {
		return _openInBrowser
	}
})()

function _openInBrowser(address) {
	switch (process.platform) {
		case 'darwin':
			execFileSync('open', [address])
			break
		case 'win32':
			execFileSync('start', [address])
			break
	}
}

