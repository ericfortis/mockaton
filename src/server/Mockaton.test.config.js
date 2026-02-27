export default {
	onReady() {},
	cookies: {
		userA: 'CookieA',
		userB: 'CookieB'
	},
	extraHeaders: ['custom_header_name', 'custom_header_val'],
	extraMimes: {
		['custom_extension']: 'custom_mime'
	},
	logLevel: 'verbose',
	corsOrigins: ['https://example.test'],
	corsExposedHeaders: ['Content-Encoding'],
	watcherEnabled: false, // But we enable it at run-time
	watcherDebounceMs: 0
}
