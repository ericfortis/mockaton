/** # @SharedWithServer */

const MOUNT = '/mockaton'

export const API = {
	dashboard: MOUNT,

	reset: MOUNT + '/reset',
	select: MOUNT + '/select',
	bulkSelect: MOUNT + '/bulk-select-by-comment',

	delay: MOUNT + '/delay',
	proxied: MOUNT + '/proxied',
	toggleStatus: MOUNT + '/toggle-status',

	cors: MOUNT + '/cors',
	cookies: MOUNT + '/cookies',
	fallback: MOUNT + '/fallback',
	collectProxied: MOUNT + '/collect-proxied',
	globalDelay: MOUNT + '/global-delay',
	globalDelayJitter: MOUNT + '/global-delay-jitter',

	writeMock: MOUNT + '/write-mock',
	deleteMock: MOUNT + '/delete-mock',
	watchMocks: MOUNT + '/watch-mocks',

	state: MOUNT + '/state',
	throws: MOUNT + '/throws',
	syncVersion: MOUNT + '/sync-version',
	watchHotReload: MOUNT + '/watch-hot-reload',

	openAPI: MOUNT + '/openapi'
}

export const DEFAULT_MOCK_COMMENT = '(default)'

export const EXT_UNKNOWN_MIME = 'unknown'
export const EXT_EMPTY = 'empty'
