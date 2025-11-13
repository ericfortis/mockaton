import { API } from './ApiConstants.js'


longPollDevChanges()
async function longPollDevChanges() {
	try {
		const response = await fetch(API.watchHotReload)
		if (!response.ok)
			throw response.statusText

		const file = await response.json() || ''
		if (file.endsWith('.css')) {
			hotReloadCSS(file)
			longPollDevChanges()
		}
		else if (file)
			location.reload()
		else
			longPollDevChanges()
	}
	catch (error) {
		console.error('hot reload', error?.message || error)
		setTimeout(longPollDevChanges, 3000)
	}
}

function hotReloadCSS(file) {
	const link = document.querySelector(`link[href*="${file}"]`)
	if (link) {
		const [url] = link.href.split('?')
		link.href = url + '?' + Date.now()
	}
}
