import { testPixels, clickLinkByText, click500Checkbox, clickDelayCheckbox, clickSaveProxiedCheckbox, typeFallbackBackend } from './_setup.js'


testPixels(import.meta.filename, {
	async setup() {
		await click500Checkbox('api/user/typescript-scores.GET')
		await clickDelayCheckbox('api/user/links.GET')
		await typeFallbackBackend('http://mybackend')
		await clickSaveProxiedCheckbox()
		await clickLinkByText('/api/user/likes')
	}
})
