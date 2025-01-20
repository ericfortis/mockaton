const MOUNT = '/mockaton'
export const API = {
	dashboard: MOUNT,
	bulkSelect: MOUNT + '/bulk-select-by-comment',
	comments: MOUNT + '/comments',
	select: MOUNT + '/select',
	delay: MOUNT + '/delay',
	mocks: MOUNT + '/mocks',
	reset: MOUNT + '/reset',
	cookies: MOUNT + '/cookies',
	fallback: MOUNT + '/fallback',
	cors: MOUNT + '/cors',
	static: MOUNT + '/static'
}

export const DF = { // Dashboard Fields (XHR)
	routeMethod: 'route_method',
	routeUrlMask: 'route_url_mask',
	delayed: 'delayed'
}

export const DEFAULT_500_COMMENT = '(Mockaton 500)'
export const DEFAULT_MOCK_COMMENT = '(default)'
export const EXT_FOR_UNKNOWN_MIME = 'unknown'
