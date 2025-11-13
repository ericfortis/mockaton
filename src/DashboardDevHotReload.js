import { API } from './ApiConstants.js'


longPoll()
async function longPoll() {
	try {
		const response = await fetch(API.watchHotReload)
		if (response.ok) {
			const editedFile = await response.json() || ''
			if (editedFile.endsWith('.css')) {
				hotReloadCSS(editedFile)
				longPoll()
			}
			else if (editedFile)
				location.reload()
			else
				longPoll()
		}
		else
			throw response.statusText
	}
	catch (error) {
		console.error('hot reload', error?.message || error)
		setTimeout(longPoll, 3000)
	}
}

function hotReloadCSS(editedFile) {
	const link = document.querySelector(`link[href*="${editedFile}"]`)
	if (link) {
		const href = link.href.split('?')[0]
		link.href = href + '?t=' + Date.now()
	}
}
