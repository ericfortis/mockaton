import { testPixels, clickLinkByText } from './_setup.js'


testPixels(import.meta.filename, {
	async setup() {
		await clickLinkByText('api/user/avatar')
	}
})
