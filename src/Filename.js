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




