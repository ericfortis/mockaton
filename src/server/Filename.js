/** @KeepSync src/client/Filename.js */

import { METHODS } from 'node:http'


const reComments = /\(.*?\)/g // Anything within parentheses

export function extractComments(file) {
	return Array.from(file.matchAll(reComments), ([c]) => c)
}

export function includesComment(file, search) {
	return extractComments(file).some(c => c.includes(search))
}


export function validateFilename(file) {
	const tokens = file.replace(reComments, '').split('.')
	if (tokens.length < 4)
		return 'Invalid Filename Convention'

	const { status, method } = parseFilename(file)
	if (!responseStatusIsValid(status))
		return `Invalid HTTP Response Status: "${status}"`

	if (!METHODS.includes(method))
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


