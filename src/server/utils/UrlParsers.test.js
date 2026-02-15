import { test } from 'node:test'
import { deepEqual, equal } from 'node:assert/strict'
import { parseSplats, parseQueryParams } from './UrlParsers.js'
import { config } from '../config.js'

test('parseQueryParams', () => {
	const searchParams = parseQueryParams('/api/foo?limit=123')
	equal(searchParams.get('limit'), '123')
})


test('parseSplats', () => {
	const p = parseSplats(
		'/api/company/123/user/456',
		`${config.mocksDir}/api/company/[companyId]/user/[userId](comments).GET.200.js`
	)
	deepEqual(p, {
		companyId: '123',
		userId: '456',
	})
})


