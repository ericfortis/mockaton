import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync } from 'node:fs'

const CONFIG = {
	mocksDir: mkdtempSync(join(tmpdir(), 'mocks')),
	staticDir: mkdtempSync(join(tmpdir(), 'static')),
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

export { CONFIG }
export default CONFIG
