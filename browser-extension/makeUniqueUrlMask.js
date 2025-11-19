import { removeTrailingSlash } from './utils.js'


export function makeUniqueUrlMask(files) {
	const result = []
	const unique = new Set()

	for (const f of files) {
		let candidate = replaceUUIDs(f)
		if (unique.has(candidate)) {
			let i = 1
			const baseCandidate = candidate
			do {
				candidate = addComment(baseCandidate, i++)
			} while (unique.has(candidate))
		}
		unique.add(candidate)
		result.push([f, candidate])
	}

	return result
}

const inputFiles = [
	'/api/user/8f3c2f9c-4c2a-4b63-9a5a-2e2c6d8d2c71.GET.200.json',
	'/api/user/3d2f1b77-9fba-4a1f-8c2e-14b6f924c3e9.GET.200.json',
	'/api/company.GET.201.js',
	'/api/user/e72ad3de-1c54-4f0b-9d0e-8c9b2a6e4312.GET.200.json',
]

const expected = [
	['/api/user/8f3c2f9c-4c2a-4b63-9a5a-2e2c6d8d2c71.GET.200.json', '/api/user/[id].GET.200.json'],
	['/api/user/3d2f1b77-9fba-4a1f-8c2e-14b6f924c3e9.GET.200.json', '/api/user/[id](1).GET.200.json'],
	['/api/company.GET.201.js', '/api/company.GET.201.js'],
	['/api/user/e72ad3de-1c54-4f0b-9d0e-8c9b2a6e4312.GET.200.json', '/api/user/[id](2).GET.200.json'],
]

// import { deepEqual } from 'node:assert'
function deepEqual (a, b) {
	console.assert(JSON.stringify(a) === JSON.stringify(b))
}

deepEqual(makeUniqueUrlMask(inputFiles), expected)


function replaceUUIDs(filename) {
	const reUUIDv4s = /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/gi
	return filename.replaceAll(reUUIDv4s, '[id]')
}

function addComment(filename, comment) {
	const { urlMask, method, status, ext } = parseFilename(filename)
	return [`${urlMask}(${comment})`, method, status, ext].join('.')
}

function parseFilename(f) {
	const tokens = f.split('.')
	return {
		ext: tokens.pop(),
		status: Number(tokens.pop()),
		method: tokens.pop(),
		urlMask: removeTrailingSlash(tokens.join('.'))
	}
}

