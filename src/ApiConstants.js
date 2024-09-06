const MOUNT = '/mockaton'
export const API = {
	dashboard: MOUNT,
	bulkSelect: MOUNT + '/bulk-select-by-comment',
	comments: MOUNT + '/comments',
	edit: MOUNT + '/edit',
	mocks: MOUNT + '/mocks',
	reset: MOUNT + '/reset',
	transform: MOUNT + '/transform',
	cookies: MOUNT + '/cookies',
	fallback: MOUNT + '/fallback'
}

export const DF = { // Dashboard Fields (XHR)
	delayed: 'delayed',
	file: 'file',
	isForDashboard: 'mock_request_payload'
}
