import { testPixels, clickLinkByText, click500Checkbox, clickDelayCheckbox, clickSaveProxiedCheckbox, typeFallbackBackend, clickProxiedCheckbox } from './_setup.js'


testPixels(import.meta.filename, {
	async setup() {
		await click500Checkbox('GET', '/api/user/friends')
		await clickDelayCheckbox('GET', '/api/user/links')
		await typeFallbackBackend('http://mybackend')
		await clickSaveProxiedCheckbox()
		await clickProxiedCheckbox('GET', '/api/video/[id]')
		await clickLinkByText('/api/user/likes')
	},

	viewports: [{
		width: 962,
		height: 800,
		deviceScaleFactor: 1.5
	}]
})
