import { testPixels, mockaton } from './_setup.js'
import { AUTO_500_COMMENT } from '../src/ApiConstants.js'


testPixels(import.meta.filename, {
	async beforeSuite() {
		await mockaton.reset()
		await mockaton.bulkSelectByComment(AUTO_500_COMMENT)
	}
})
