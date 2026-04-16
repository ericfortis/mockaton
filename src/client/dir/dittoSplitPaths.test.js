import { test } from 'node:test'
import { deepEqual } from 'node:assert/strict'
import { dittoSplitPaths } from './dittoSplitPaths.js'


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

