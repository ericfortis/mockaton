import { mockaton } from '../setup.js'
import { testPixels } from '../utils.js'


testPixels(import.meta.filename, {
	async beforeSuite() {
		await mockaton.reset()
		await mockaton.bulkSelectByComment('(verified)')
	}
})
