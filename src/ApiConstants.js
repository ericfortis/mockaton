const MOUNT = '/mockaton'
export const API = {
	dashboard: MOUNT,
	bulkSelect: MOUNT + '/bulk-select-by-comment',
	comments: MOUNT + '/comments',
	select: MOUNT + '/select',
	delay: MOUNT + '/delay',
	globalDelay: MOUNT + '/global-delay',
	mocks: MOUNT + '/mocks',
	reset: MOUNT + '/reset',
	cookies: MOUNT + '/cookies',
	fallback: MOUNT + '/fallback',
	collectProxied: MOUNT + '/collect-proxied',
	proxied: MOUNT + '/proxied',
	cors: MOUNT + '/cors',
	static: MOUNT + '/static',
	syncVersion: MOUNT + '/sync_version'
}

export const DF = { // Dashboard Fields (XHR)
	routeMethod: 'route_method',
	routeUrlMask: 'route_url_mask',
	delayed: 'delayed',
	proxied: 'proxied',
	syncVersion: 'last_received_sync_version'
}

export const DEFAULT_500_COMMENT = '(Mockaton 500)'
export const DEFAULT_MOCK_COMMENT = '(default)'
export const EXT_FOR_UNKNOWN_MIME = 'unknown'

export const LONG_POLL_SERVER_TIMEOUT = 8_000

export const HEADER_FOR_502 = 'mockaton502'
