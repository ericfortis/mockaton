import { testPixels, clickLinkByText, click500Checkbox, clickDelayCheckbox, clickSaveProxiedCheckbox, typeFallbackBackend, clickProxiedCheckbox } from './_setup.js'


testPixels(import.meta.filename, {
	async setup() {
		await click500Checkbox('api/user/typescript-scores.GET')
		await sleep()
		await clickDelayCheckbox('api/user/links.GET')
		await sleep()
		await typeFallbackBackend('http://mybackend')
		await clickSaveProxiedCheckbox()
		await sleep()
		await clickProxiedCheckbox('api/video/[id].GET')
		await sleep()
		await clickLinkByText('/api/user/likes')
	},

	viewports: [{
		width: 860,
		height: 800,
		deviceScaleFactor: 1.5
	}]
})


function sleep(ms = 100) {
	return new Promise(resolve => setTimeout(resolve, ms))
}
