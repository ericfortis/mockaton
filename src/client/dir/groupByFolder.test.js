import { test } from 'node:test'
import { deepEqual } from 'node:assert/strict'
import { groupByFolder } from './groupByFolder.js'

const PartialBrokerRowModel = (method, urlMask, ...children) =>
	({ method, urlMask, children })

test('groupByFolder', () => {
	const input = [
		PartialBrokerRowModel('GET', '/api/user'),
		PartialBrokerRowModel('GET', '/api/user/avatar'),
		PartialBrokerRowModel('GET', '/api/video/[id]'),
		PartialBrokerRowModel('GET', '/index.html'),
		PartialBrokerRowModel('GET', '/media/file-a.txt'),
		PartialBrokerRowModel('GET', '/media/file-b.txt'),
		PartialBrokerRowModel('GET', '/media/sub/file-aa.txt'),
		PartialBrokerRowModel('GET', '/media/sub/file-bb.txt'),
		PartialBrokerRowModel('POST', '/api/user'),
		PartialBrokerRowModel('POST', '/api/user/avatar/foo'),
		PartialBrokerRowModel('PATCH', '/api/user')
	]

	const expected = [
		PartialBrokerRowModel('GET', '/api/user',
			PartialBrokerRowModel('GET', '/api/user/avatar',
				PartialBrokerRowModel('POST', '/api/user/avatar/foo')),
			PartialBrokerRowModel('POST', '/api/user'),
			PartialBrokerRowModel('PATCH', '/api/user')),
		PartialBrokerRowModel('GET', '/api/video/[id]'),
		PartialBrokerRowModel('GET', '/index.html'),
		PartialBrokerRowModel('GET', '/media/file-a.txt',
			PartialBrokerRowModel('GET', '/media/file-b.txt'),
			PartialBrokerRowModel('GET', '/media/sub/file-aa.txt',
				PartialBrokerRowModel('GET', '/media/sub/file-bb.txt')))
	]

	deepEqual(groupByFolder(input), expected)
})
