// @KeepSync src/server/Filename.js

const reComments = /\(.*?\)/g // Anything within parentheses

export function extractComments(file) {
	return Array.from(file.matchAll(reComments), ([c]) => c)
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
