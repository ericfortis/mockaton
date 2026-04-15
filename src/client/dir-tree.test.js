import { test } from 'node:test'
import { deepEqual } from 'node:assert/strict'
import { groupByFolder, dittoSplitPaths } from './dir-tree.js'


test('dittoSplitPaths', () => {
	const input = [
		'/api/user',
		'/api/user/avatar',
		'/api/user/friends',
		'/api/vid',
		'/api/video/id',
		'/api/video/stats',
		'/v2/foo',
		'/v2/foo/bar'
	]
	deepEqual(dittoSplitPaths(input), [
		['', '/api/user'],
		['/api/user/', 'avatar'],
		['/api/user/', 'friends'],
		['/api/', 'vid'],
		['/api/', 'video/id'],
		['/api/video/', 'stats'],
		['', '/v2/foo'],
		['/v2/foo/', 'bar']
	])
})


test('dirStructure', () => {
	const input = [
		{ children: [], method: 'GET', urlMask: '/api/user' },
		{ children: [], method: 'GET', urlMask: '/api/user/avatar' },
		{ children: [], method: 'GET', urlMask: '/api/video/[id]' },
		{ children: [], method: 'GET', urlMask: '/index.html' },
		{ children: [], method: 'GET', urlMask: '/media/file-a.txt' },
		{ children: [], method: 'GET', urlMask: '/media/file-b.txt' },
		{ children: [], method: 'GET', urlMask: '/media/sub/file-aa.txt' },
		{ children: [], method: 'GET', urlMask: '/media/sub/file-bb.txt' },
		{ children: [], method: 'POST', urlMask: '/api/user' },
		{ children: [], method: 'POST', urlMask: '/api/user/avatar/foo' },
		{ children: [], method: 'PATCH', urlMask: '/api/user' }
	]


	const expected = [
		{
			urlMask: '/api/user',
			method: 'GET',
			children: [
				{
					urlMask: '/api/user/avatar',
					method: 'GET',
					children: [
						{
							urlMask: '/api/user/avatar/foo',
							method: 'POST',
							children: []
						}
					]
				}, {
					urlMask: '/api/user',
					method: 'POST',
					children: []
				}, {
					urlMask: '/api/user',
					method: 'PATCH',
					children: []
				}
			]
		},
		{
			urlMask: '/api/video/[id]',
			method: 'GET',
			children: []
		},
		{
			urlMask: '/index.html',
			method: 'GET',
			children: []
		},
		{
			urlMask: '/media/file-a.txt',
			method: 'GET',
			children: [
				{
					urlMask: '/media/file-b.txt',
					method: 'GET',
					children: []
				}, {
					urlMask: '/media/sub/file-aa.txt',
					method: 'GET',
					children: [
						{
							urlMask: '/media/sub/file-bb.txt',
							method: 'GET',
							children: []
						}
					]
				}
			]
		}
	]

	deepEqual(groupByFolder(input), expected)
})
