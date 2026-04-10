/** # @SharedWithServer */

const MOUNT = '/mockaton'

export const API = {
	dashboard: MOUNT,
	bulkSelect: MOUNT + '/bulk-select-by-comment',
	collectProxied: MOUNT + '/collect-proxied',
	cookies: MOUNT + '/cookies',
	cors: MOUNT + '/cors',
	delay: MOUNT + '/delay',
	fallback: MOUNT + '/fallback',
	globalDelay: MOUNT + '/global-delay',
	globalDelayJitter: MOUNT + '/global-delay-jitter',
	proxied: MOUNT + '/proxied',
	reset: MOUNT + '/reset',
	select: MOUNT + '/select',
	state: MOUNT + '/state',
	syncVersion: MOUNT + '/sync-version',
	throws: MOUNT + '/throws',
	toggle500: MOUNT + '/toggle500',
	watchHotReload: MOUNT + '/watch-hot-reload',
	watchMocks: MOUNT + '/watch-mocks',
}

export const HEADER_502 = 'Mockaton502'

export const DEFAULT_MOCK_COMMENT = '(default)'

export const EXT_UNKNOWN_MIME = 'unknown'
export const EXT_EMPTY = 'empty'
