const MOUNT = '/mockaton'
export const DP = { // Dashboard Paths
	dashboard: MOUNT,
	bulkSelect: MOUNT + '/bulk-select',
	comments: MOUNT + '/comments',
	edit: MOUNT + '/edit',
	mocks: MOUNT + '/mocks',
	reset: MOUNT + '/reset',
	transform: MOUNT + '/transform',
	cookies: MOUNT + '/cookies'
}

export const DF = { // Dashboard Fields (XHR)
	comment: 'comment',
	delayed: 'delayed',
	file: 'file',
	isAdmin: 'is_admin',
	currentCookieKey: 'current_cookie_key',
	isForDashboard: 'mock_request_payload',
	method: 'method',
	urlMask: 'url_mask'
}
