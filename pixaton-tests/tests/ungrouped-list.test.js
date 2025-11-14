import { testPixels } from '../setup.js'


testPixels(import.meta.filename, {
	async setup(page) {
		await page.goto(page.url() + '?groupByMethod=false')
	}
})
