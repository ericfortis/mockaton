const MOUNT = '/mockaton'
export const API = {
	dashboard: MOUNT,
	bulkSelect: MOUNT + '/bulk-select-by-comment',
	comments: MOUNT + '/comments',
	edit: MOUNT + '/edit',
	mocks: MOUNT + '/mocks',
	reset: MOUNT + '/reset',
	cookies: MOUNT + '/cookies',
	fallback: MOUNT + '/fallback'
}

export const DF = { // Dashboard Fields (XHR)
	delayed: 'delayed',
	file: 'file'
}

export const DEFAULT_500_COMMENT = '(Mockaton Temp 500)'
