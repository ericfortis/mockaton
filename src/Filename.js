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


export function filenameIsValid(file) {
	const error = validateFilename(file)
	if (error)
		console.error(error, file)
	return !error
}

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




