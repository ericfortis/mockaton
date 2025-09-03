import { testPixels, clickLinkByText, click500Checkbox, clickDelayCheckbox, clickSaveProxiedCheckbox, typeFallbackBackend, clickProxiedCheckbox } from './_setup.js'


testPixels(import.meta.filename, {
	async setup() {
		await click500Checkbox('GET', '/api/user/friends')
		await clickDelayCheckbox('GET', '/api/user/links?limit=[limit]')
		await typeFallbackBackend('http://mybackend')
		await clickSaveProxiedCheckbox()
		await sleep()
		await clickProxiedCheckbox('GET', '/api/video/[id]')
		await clickLinkByText('/api/user/likes')
	},

	viewports: [{
		width: 880,
		height: 800,
		deviceScaleFactor: 1.5
	}]
})

async function sleep(ms = 50) {
	return new Promise(resolve => setTimeout(resolve, ms))
}
