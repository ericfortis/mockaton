import { API } from './ApiConstants.js'


longPollDevChanges()
async function longPollDevChanges() {
	try {
		const response = await fetch(API.watchHotReload)
		if (!response.ok)
			throw response.statusText

		const file = await response.json() || ''
		if (file.endsWith('.css')) {
			await hotReloadCSS(file)
			longPollDevChanges()
		}
		else if (file)
			location.reload()
		else // server timeout
			longPollDevChanges()
	}
	catch (error) {
		console.error('hot reload', error?.message || error)
		setTimeout(longPollDevChanges, 3000)
	}
}

async function hotReloadCSS(file) {
	const mod = await import(`./${file}?${Date.now()}`, { with: { type: 'css' } })
	document.adoptedStyleSheets = [mod.default]
}
