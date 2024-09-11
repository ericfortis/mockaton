const httpMethods = [
	'CONNECT', 'DELETE', 'GET',
	'HEAD', 'OPTIONS', 'PATCH',
	'POST', 'PUT', 'TRACE'
]

const reComments = /\(.*?\)/g // Anything within parentheses

export const extractComments = filename =>
	Array.from(filename.matchAll(reComments), ([comment]) => comment)

export const includesComment = (filename, search) =>
	extractComments(filename).some(comment => comment.includes(search))


export function parseFilename(file) {
	const tokens = file.replace(reComments, '').split('.')
	if (tokens.length < 4)
		return { error: 'Invalid Filename Convention' }

	const method = tokens.at(-3)
	const status = Number(tokens.at(-2))

	if (!httpMethods.includes(method))
		return { error: `Unrecognized HTTP Method: "${method}"` }

	if (!responseStatusIsValid(status))
		return { error: `Invalid HTTP Response Status: "${status}"` }

	return {
		urlMask: '/' + removeTrailingSlash(tokens.slice(0, -3).join('.')),
		method,
		status
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




export class Route {
	#urlRegex

	constructor(urlMask) {
		this.#urlRegex = new RegExp('^' + disregardVariables(removeQueryStringAndFragment(urlMask)) + '/*$')
	}

	// Appending a '/' so URLs ending with variables don't match
	// URLs that have a path after that variable. For example,
	// without it, the following regex would match both of these URLs:
	//   api/foo/[route_id] => api/foo/.*  (wrong match because it’s too greedy)
	//   api/foo/[route_id]/suffix => api/foo/.*/suffix
	// By the same token, the regex handles many trailing
	// slashes. For instance, for routing api/foo/[id]?qs…
	urlMaskMatches(url) {
		return this.#urlRegex.test(removeQueryStringAndFragment(decodeURIComponent(url)) + '/')
	}
}

// Stars out (for regex) all the paths that are in square brackets
function disregardVariables(str) {
	return str.replace(/\[.*?]/g, '[^/]*')
}

function removeQueryStringAndFragment(urlMask) {
	return urlMask.replace(/[?#].*/, '')
}

