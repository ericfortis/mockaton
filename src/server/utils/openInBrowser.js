import { spawnSync } from 'node:child_process'


export const openInBrowser = (async () => {
	try {
		return (await import('open')).default
	}
	catch {
		return _openInBrowser
	}
})()

function _openInBrowser(address) {
	let command
	let args = [address]

	switch (process.platform) {
		case 'darwin':
			command = 'open'
			break

		case 'win32':
			command = 'cmd'
			args = ['/c', 'start', '', address]
			break

		default:
			command = ['xdg-open', 'gnome-open', 'kde-open'].find(function hasCommand(cmd) {
				const { status } = spawnSync('command', ['-v', cmd], { stdio: 'ignore' })
				return status === 0
			})
	}

	if (command)
		spawnSync(command, args)
}

