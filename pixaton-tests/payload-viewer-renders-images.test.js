import { testPixels } from './_setup.js'


testPixels(import.meta.filename, {
	async setup(page) {
		const linkText = '/api/user/avatar'
		await page.locator(`a ::-p-text(${linkText})`).click()
	}
})
