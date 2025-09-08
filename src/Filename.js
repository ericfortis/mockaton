const httpMethods = [ // @KeepSync with node:http.METHODS
	'ACL', 'BIND', 'CHECKOUT',
	'CONNECT', 'COPY', 'DELETE',
	'GET', 'HEAD', 'LINK',
	'LOCK', 'M-SEARCH', 'MERGE',
	'MKACTIVITY', 'MKCALENDAR', 'MKCOL',
	'MOVE', 'NOTIFY', 'OPTIONS',
	'PATCH', 'POST', 'PROPFIND',
	'PROPPATCH', 'PURGE', 'PUT',
	'QUERY', 'REBIND', 'REPORT',
	'SEARCH', 'SOURCE', 'SUBSCRIBE',
	'TRACE', 'UNBIND', 'UNLINK',
	'UNLOCK', 'UNSUBSCRIBE'
]

const reComments = /\(.*?\)/g // Anything within parentheses

export const extractComments = filename =>
	Array.from(filename.matchAll(reComments), ([comment]) => comment)

export const includesComment = (filename, search) =>
	extractComments(filename).some(comment => comment.includes(search))


// TODO ThinkAbout 206 (reject, handle, or send in full?)
export function validateFilename(file) {
	const tokens = file.replace(reComments, '').split('.')
	if (tokens.length < 4)
		return 'Invalid Filename Convention'

	const { status, method } = parseFilename(file)
	if (!responseStatusIsValid(status))
		return `Invalid HTTP Response Status: "${status}"`

	if (!httpMethods.includes(method))
		return `Unrecognized HTTP Method: "${method}"`
}


export function parseFilename(file) {
	const tokens = file.replace(reComments, '').split('.')
	return {
		ext: tokens.pop(),
		status: Number(tokens.pop()),
		method: tokens.pop(),
		urlMask: '/' + removeTrailingSlash(tokens.join('.'))
	}
}

function removeTrailingSlash(url = '') {
	return url
		.replace(/\/$/, '')
		.replace('/?', '?')
		.replace('/#', '#')
}

// TODO ThinkAbout allowing custom status codes
function responseStatusIsValid(status) {
	return Number.isInteger(status)
		&& status >= 100
		&& status <= 599
}


export function makeMockFilename(url, method, status, ext) {
	const urlMask = replaceIds(removeTrailingSlash(url))
	return [urlMask, method, status, ext].join('.')
}

const reUuidV4 = /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/gi
function replaceIds(filename) {
	return filename.replaceAll(reUuidV4, '[id]')
}


