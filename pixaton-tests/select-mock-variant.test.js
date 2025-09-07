import { testPixels, mockaton, clickLinkByText } from './_setup.js'


testPixels(import.meta.filename, {
	async beforeSuite() {
		await mockaton.reset()
		await mockaton.select('api/user/friends.GET.204.empty')
	},
	
	async setup() {
		await clickLinkByText('/api/user/friends')
	}
})
