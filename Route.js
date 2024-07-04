const httpMethods = [
	'CONNECT',
	'DELETE',
	'GET',
	'HEAD',
	'OPTIONS',
	'PATCH',
	'POST',
	'PUT',
	'TRACE'
]

export class Route {
	#urlRegex

	constructor(file) {
		const { urlMask, method } = Route.parseFilename(file)
		this.method = method
		this.#urlRegex = new RegExp('^' + disregardVariables(removeQueryStringAndFragment(urlMask)) + '/*$')
	}

	urlMaskMatches(url) {
		// Appending a '/' so URLs ending with variables don't match
		// URLs that have a path after that variable. For example,
		// without it, the following regex would match both of these URLs:
		//   api/foo/[route_id] => api/foo/.*  (wrong match because it’s too greedy)
		//   api/foo/[route_id]/suffix => api/foo/.*/suffix
		// By the same token, the regex handles many trailing
		// slashes. For instance, for routing api/foo/[id]?qs…
		return this.#urlRegex.test(removeQueryStringAndFragment(url) + '/')
	}

	// Anything within parentheses in the filename is a comment, including the parentheses.
	static reComments = /\(.*?\)/g

	static extractComments(filename) {
		return Array.from(filename.matchAll(Route.reComments), ([comment]) => comment)
	}

	static hasInParentheses(filename, search) {
		return Route.extractComments(filename)
			.some(comment => comment.includes(search))
	}

	static parseFilename(file) {
		const tokens = file.replace(Route.reComments, '').split('.')

		let error = ''
		if (tokens.length < 4)
			error = 'Invalid Filename Convention'

		const method = tokens.at(-3)
		if (!httpMethods.includes(method))
			error = `Unrecognized HTTP Method: "${method}"`

		const status = Number(tokens.at(-2))
		if (!responseStatusIsValid(status))
			error = `Invalid HTTP Response Status: "${status}"`

		return {
			error,
			urlMask: '/' + removeTrailingSlash(tokens.at(-4)),
			method,
			status
		}
	}
}


// Stars out (for regex) all the paths that are in square brackets
function disregardVariables(str) {
	return str.replace(/\[.*?]/g, '[^/]*')
}

function removeQueryStringAndFragment(urlMask) {
	return urlMask.replace(/[?#].*/, '')
}

function removeTrailingSlash(url = '') {
	return decodeURIComponent(url
		.replace(/\/$/, '')
		.replace('/?', '?')
		.replace('/#', '#'))
}

function responseStatusIsValid(status) {
	return Number.isInteger(status)
		&& status >= 100
		&& status <= 599
}
