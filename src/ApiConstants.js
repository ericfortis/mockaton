const MOUNT = '/mockaton'
export const API = {
	dashboard: MOUNT,
	bulkSelect: MOUNT + '/bulk-select-by-comment',
	collectProxied: MOUNT + '/collect-proxied',
	comments: MOUNT + '/comments',
	cookies: MOUNT + '/cookies',
	cors: MOUNT + '/cors',
	delay: MOUNT + '/delay',
	delayStatic: MOUNT + '/delay-static',
	fallback: MOUNT + '/fallback',
	globalDelay: MOUNT + '/global-delay',
	mocks: MOUNT + '/mocks',
	notFoundStatic: MOUNT + '/not-found-static',
	proxied: MOUNT + '/proxied',
	reset: MOUNT + '/reset',
	select: MOUNT + '/select',
	static: MOUNT + '/static',
	syncVersion: MOUNT + '/sync_version'
}

export const DF = { // Dashboard Fields (XHR)
	routeMethod: 'route_method',
	routeUrlMask: 'route_url_mask',
	delayed: 'delayed',
	proxied: 'proxied',
	shouldBeNotFound: 'should_be_not_found',
	syncVersion: 'last_received_sync_version'
}

export const DEFAULT_500_COMMENT = '(Mockaton 500)'
export const DEFAULT_MOCK_COMMENT = '(default)'
export const EXT_FOR_UNKNOWN_MIME = 'unknown'

export const LONG_POLL_SERVER_TIMEOUT = 8_000

export const HEADER_FOR_502 = 'mockaton502'
