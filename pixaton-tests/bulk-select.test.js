import { testPixels, selectFromDropdown } from './_setup.js'


testPixels(import.meta.filename, {
	async setup() {
		await selectFromDropdown({
			qaId: 'BulkSelector',
			target: '(Mockaton 500)'
		})
	}
})
