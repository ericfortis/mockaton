const httpMethods = [ // node:http.METHODS
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


export function filenameIsValid(file) {
	const error = validateFilename(file)
	if (error)
		console.error(error, file)
	return !error
}

// TODO ThinkAbout 206 (reject, handle, or send in full?)
function validateFilename(file) {
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
		urlMask: '/' + removeTrailingSlash(tokens.slice(0, -3).join('.')),
		method: tokens.at(-3),
		status: Number(tokens.at(-2)),
		ext: tokens.at(-1)
	}
}

function removeTrailingSlash(url = '') {
	return url
		.replace(/\/$/, '')
		.replace('/?', '?')
		.replace('/#', '#')
}

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


