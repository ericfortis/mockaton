import { testPixels, mockaton } from '../setup.js'


testPixels(import.meta.filename, {
	async beforeSuite() {
		await mockaton.reset()
		await mockaton.bulkSelectByComment('(verified)')
	}
})
