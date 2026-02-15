import { spawnSync } from 'node:child_process'


export const openInBrowser = (async () => {
	try {
		return (await import('open')).default
	}
	catch (error) {
		return _openInBrowser
	}
})()

function _openInBrowser(address) {
	let opener
	switch (process.platform) {
		case 'darwin':
			opener = 'open'
			break
		case 'win32':
			opener = 'start'
			break
		default:
			opener = ['xdg-open', 'gnome-open', 'kde-open'].find(hasCommand)
	}
	if (opener)
		spawnSync(opener, [address])
}

function hasCommand(cmd) {
	const { status } = spawnSync('command', ['-v', cmd], { stdio: 'ignore' })
	return status === 0
}
