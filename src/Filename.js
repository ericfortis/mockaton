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
	const status = Number(tokens.at(-2))
	const method = tokens.at(-3)
	const urlMask = '/' + removeTrailingSlash(tokens.slice(0, -3).join('.'))
	return { urlMask, method, status }
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




