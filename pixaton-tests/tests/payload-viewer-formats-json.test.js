import { testPixels, clickLinkByText } from '../setup.js'


testPixels(import.meta.filename, {
	async setup() {
		await clickLinkByText('/api/user')
	}
})
