import { jwtCookie } from '../../index.js'

export default {
	cookies: {
		userA: 'CookieA',
		userB: jwtCookie('CookieB', { email: 'john@example.test' }),
	},
	extraHeaders: ['custom_header_name', 'custom_header_val'],
	extraMimes: { ['custom_extension']: 'custom_mime' },
	logLevel: 'verbose',
	corsOrigins: ['https://example.test'],
	corsExposedHeaders: ['Content-Encoding'],
	watcherEnabled: false, // But we enable it at run-time
	watcherDebounceMs: 0
}
