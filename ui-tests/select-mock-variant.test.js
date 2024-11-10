import { testPixels } from './_setup.js'


testPixels(import.meta.filename, {
	async setup(page) {
		const qaId = '/api/user/friends'
		const target = 'api/user/friends.GET.204.json'
		await page.select(`select[data-qaid="${qaId}"]`, target)
	}
})
