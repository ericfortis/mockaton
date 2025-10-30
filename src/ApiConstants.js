const MOUNT = '/mockaton'
export const API = {
	dashboard: MOUNT,
	bulkSelect: MOUNT + '/bulk-select-by-comment',
	collectProxied: MOUNT + '/collect-proxied',
	cookies: MOUNT + '/cookies',
	cors: MOUNT + '/cors',
	delay: MOUNT + '/delay',
	delayStatic: MOUNT + '/delay-static',
	fallback: MOUNT + '/fallback',
	globalDelay: MOUNT + '/global-delay',
	proxied: MOUNT + '/proxied',
	reset: MOUNT + '/reset',
	select: MOUNT + '/select',
	state: MOUNT + '/state',
	staticStatus: MOUNT + '/static-status',
	syncVersion: MOUNT + '/sync-version',
	throws: MOUNT + '/throws',
	toggle500: MOUNT + '/toggle500'
}

export const HEADER_FOR_502 = 'Mockaton502'
export const HEADER_FOR_SYNC_VERSION = 'sync_version'

export const DEFAULT_MOCK_COMMENT = '(default)'
export const EXT_FOR_UNKNOWN_MIME = 'unknown'
export const LONG_POLL_SERVER_TIMEOUT = 8_000
