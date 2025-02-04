import { testPixels, mockaton } from './_setup.js'
import { QaId } from '../src/QaId.js'


testPixels(import.meta.filename, QaId.Header, {
	async setup() {
		await mockaton.selectCookie('Non-Admin User')
	}
})
