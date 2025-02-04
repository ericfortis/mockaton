import { testPixels, mockaton } from './_setup.js'
import { QaId } from '../src/QaId.js'


testPixels(import.meta.filename, QaId.ColorList, {
	async setup() {
		await mockaton.selectCookie('Admin User')
	}
})
