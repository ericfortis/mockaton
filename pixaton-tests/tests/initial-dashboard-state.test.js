import { testPixels } from '../utils.js'


testPixels(import.meta.filename, {
	viewports: [
		{ width: 1024, height: 800 },
		{ width: 500, height: 720 },
	]
})
	
