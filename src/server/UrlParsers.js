import { relative } from 'node:path'
import { config } from './config.js'
import { decode } from './utils/HttpIncomingMessage.js'
import { parseFilename, removeTrailingSlash, removeQueryStringAndFragment } from '../client/Filename.js'


export function parseQueryParams(url) {
	return new URL(url, 'http://_').searchParams
}

/** @deprecated Use parseSegments */
export function parseSplats(url, filename) {
	console.info('parseSplats is deprecated in favor of parseSegments')
	return parseSegments(url, filename)
}


export function parseSegments(url, filename) {
	const { urlMask } = parseFilename(relative(config.mocksDir, filename))

	const splats = []
	const pattern = removeQueryStringAndFragment(decode(urlMask))
		.replace(/\[(.+?)]/g, (_, name) => {
			splats.push(name)
			return '([^/]+)'
		})

	let u = removeQueryStringAndFragment(url)
	u = removeTrailingSlash(u)

	const match = u.match(new RegExp(`^${pattern}$`))
	if (!match)
		return {}

	return splats.reduce((acc, name, i) => {
		acc[name] = match[i + 1]
		return acc
	}, {})
}
