import { testPixels, clickLinkByText, click500Checkbox, clickDelayCheckbox, clickSaveProxiedCheckbox, typeFallbackBackend, clickProxiedCheckbox } from './_setup.js'


testPixels(import.meta.filename, {
	async setup() {
		await click500Checkbox('GET', '/api/user/friends')
		await sleep()
		await clickDelayCheckbox('GET', '/api/user/links')
		await sleep()
		await typeFallbackBackend('http://mybackend')
		await clickSaveProxiedCheckbox()
		await sleep()
		await clickProxiedCheckbox('GET', '/api/video/[id]')
		await sleep()
		await clickLinkByText('/api/user/likes')
	},

	viewports: [{
		width: 840,
		height: 800,
		deviceScaleFactor: 1.5
	}]
})


function sleep(ms = 100) {
	return new Promise(resolve => setTimeout(resolve, ms))
}
