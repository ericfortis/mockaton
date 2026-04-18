import { test, describe } from 'node:test'
import { deepEqual, equal } from 'node:assert/strict'
import { parseSegments, parseQueryParams } from './UrlParsers.js'
import { config } from './config.js'

test('parseQueryParams', () => {
	const searchParams = parseQueryParams('/api/foo?limit=123')
	equal(searchParams.get('limit'), '123')
})


describe('parseSegments', () => {
	test('one segment', () => {
		const segments = parseSegments(
			'/api/company/123',
			`${config.mocksDir}/api/company/[companyId].GET.200.js`
		)
		deepEqual(segments, {
			companyId: '123'
		})
	})

	test('one segment with trailing slash', () => {
		const segments = parseSegments(
			'/api/company/123/',
			`${config.mocksDir}/api/company/[companyId].GET.200.js`
		)
		deepEqual(segments, {
			companyId: '123'
		})
	})

	test('two segments and comment', () => {
		const segments = parseSegments(
			'/api/company/123/user/456',
			`${config.mocksDir}/api/company/[companyId]/user/[userId](comments).GET.200.js`
		)
		deepEqual(segments, {
			companyId: '123',
			userId: '456',
		})
	})

	test('ignores query string', () => {
		const segments = parseSegments(
			'/api/company/123?foo=456',
			`${config.mocksDir}/api/company/[companyId]?foo=[fooId].GET.200.js`
		)
		deepEqual(segments, {
			companyId: '123'
		})
	})
})


