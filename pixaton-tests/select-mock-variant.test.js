import { testPixels, selectFromDropdown } from './_setup.js'


testPixels(import.meta.filename, {
	async setup() {
		await selectFromDropdown({
			qaId: '/api/user/friends',
			target: 'api/user/friends.GET.204.empty'
		})
	}
})
