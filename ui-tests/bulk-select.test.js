import { testPixels } from './_setup.js'


testPixels(import.meta.filename, {
	async setup(page) {
		const qaId = 'BulkSelector'
		const target = '(Mockaton 500)'
		await page.select(`select[data-qaid="${qaId}"]`, target)
	}
})
