/** # @SharedWithServer */

const METHODS = [ // @KeepSync node:http.METHODS
	'ACL', 'BIND', 'CHECKOUT', 'CONNECT', 'COPY', 'DELETE',
	'GET', 'HEAD', 'LINK', 'LOCK', 'M-SEARCH', 'MERGE',
	'MKACTIVITY', 'MKCALENDAR', 'MKCOL', 'MOVE', 'NOTIFY', 'OPTIONS',
	'PATCH', 'POST', 'PROPFIND', 'PROPPATCH', 'PURGE', 'PUT',
	'QUERY', 'REBIND', 'REPORT', 'SEARCH', 'SOURCE', 'SUBSCRIBE',
	'TRACE', 'UNBIND', 'UNLINK', 'UNLOCK', 'UNSUBSCRIBE'
]

const reComments = /\([^()]*\)/g // Anything within parentheses

export function extractComments(file) {
	return Array.from(file.matchAll(reComments), ([c]) => c)
}

export function includesComment(file, search) {
	return extractComments(file).some(c => c.includes(search))
}

export function parseFilename(file) {
	const tokens = file.replace(reComments, '').split('.')

	const followsConvention = tokens.length > 3
		&& responseStatusIsValid(Number(tokens.at(-2)))
		&& METHODS.includes(tokens.at(-3))

	return followsConvention
		? {
			isStatic: false,
			ext: tokens.pop(),
			status: Number(tokens.pop()),
			method: tokens.pop(),
			urlMask: '/' + removeTrailingSlash(tokens.join('.'))
		}
		: {
			isStatic: true,
			ext: tokens.pop() || '',
			status: 200,
			method: 'GET',
			urlMask: '/' + file
		}
}

export function removeTrailingSlash(url = '') {
	return url
		.replace(/\/$/, '')
		.replace('/?', '?')
		.replace('/#', '#')
}

export function removeQueryStringAndFragment(url = '') {
	return new URL(url, 'http://_').pathname
}

function responseStatusIsValid(status) {
	return Number.isInteger(status)
		&& status >= 100
		&& status <= 599
}

export function makeMockFilename(url, method, status, ext, comment = '') {
	const urlMask = replaceIds(removeTrailingSlash(url))
	return [urlMask + comment, method, status, ext].join('.')
}

function replaceIds(filename) {
	return filename.replaceAll(replaceIds.reUuidV4, '[id]')
}
replaceIds.reUuidV4 = /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/gi
