import { mockaton } from '../setup.js'
import { clickLinkByText, testPixels } from '../utils.js'


testPixels(import.meta.filename, {
	async beforeSuite() {
		await mockaton.reset()
		await mockaton.select('api/user/friends.GET.204.empty')
	},
	
	async setup() {
		await clickLinkByText('/api/user/friends')
	}
})
