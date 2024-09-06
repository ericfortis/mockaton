const MOUNT = '/mockaton'
export const API = {
	dashboard: MOUNT,
	bulkSelect: MOUNT + '/bulk-select',
	comments: MOUNT + '/comments',
	edit: MOUNT + '/edit',
	mocks: MOUNT + '/mocks',
	reset: MOUNT + '/reset',
	transform: MOUNT + '/transform',
	cookies: MOUNT + '/cookies',
	fallback: MOUNT + '/fallback'
}

export const DF = { // Dashboard Fields (XHR)
	comment: 'comment',
	delayed: 'delayed',
	file: 'file',
	currentCookieKey: 'current_cookie_key',
	isForDashboard: 'mock_request_payload'
}
