import { testPixels, mockaton, clickLinkByText } from './_setup.js'


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

	async setup() {
		await clickLinkByText('/api/user/likes')
	},

	viewports: [{
		width: 880,
		height: 768,
		deviceScaleFactor: 1.5
	}],

	colorSchemes: ['light', 'dark']
})
