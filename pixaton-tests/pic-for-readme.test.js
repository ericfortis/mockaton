import { testPixels } from './_setup.js'


testPixels(import.meta.filename, {
	async setup(page) {
		const mockForShowingAutogen500 = 'api/user/typescript-scores.GET.200.ts'
		const checkbox500 = `.InternalServerErrorToggler > input[type=checkbox][name="${mockForShowingAutogen500}"]`
		await page.waitForSelector(checkbox500)
		await page.$eval(checkbox500, el => el.click())

		const mockForShowingDelay = 'api/user/links.GET.200.js'
		const delayCheckbox = `.DelayToggler > input[type=checkbox][name="${mockForShowingDelay}"]`
		await page.waitForSelector(delayCheckbox)
		await page.$eval(delayCheckbox, el => el.click())

		const fall = '.FallbackBackend input[type=url]'
		await page.type(fall, 'http://mybackend')
		await page.$eval(fall, el => el.blur())

		await page.$eval('.FallbackBackend input[type=checkbox]', el => el.click())

		const routeForDisplayingPayload = '/api/user/likes'
		await page.locator(`a ::-p-text(${routeForDisplayingPayload})`).click()
	}
})
