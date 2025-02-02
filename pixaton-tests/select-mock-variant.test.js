import { testPixels } from './_setup.js'


testPixels(import.meta.filename, {
	async setup(page) {
		const qaId = '/api/user/friends'
		const selector = `select[data-qaid="${qaId}"]`
		await page.click(selector) // Just for showing focus state
		await page.select(selector, 'api/user/friends.GET.204.json')
	}
})
