import { mockaton } from '../setup.js'
import { clickLinkByText, testPixels } from '../utils.js'


testPixels(import.meta.filename, {
	async beforeSuite() {
		await mockaton.setProxyFallback('http://mybackend')
		await mockaton.setCollectProxied(true)
		await mockaton.select('api/user/friends.GET.500.txt')
		await mockaton.setRouteIsProxied('GET', '/api/video/[id]', true)
		await mockaton.setRouteIsDelayed('GET', '/api/user/links?limit=[limit]', true)
	},

	async afterSuite() {
		await mockaton.setProxyFallback('')
		await mockaton.setCollectProxied(false)
	},

	async setup(page) {
		await clickLinkByText('/api/user/likes')
		await page.evaluate(() => {
			const el = document.querySelector('.leftSide')
			if (el) el.style.width = '505px'
		})
		
		// Avoid hover styles. Moving twice, because there are two tests, so we
		// need to move the pointer to a new location. Otherwise, it’s a noop.
		await page.mouse.move(0, 0)
		await page.mouse.move(1, 0)
	},

	viewports: [{
		width: 762,
		height: 762,
		deviceScaleFactor: 1.5
	}],

	colorSchemes: ['light', 'dark']
})
