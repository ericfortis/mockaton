import { clickLinkByText, testPixels } from '../utils.js'


testPixels(import.meta.filename, {
	async setup() {
		await clickLinkByText('api/user/avatar')
	}
})
