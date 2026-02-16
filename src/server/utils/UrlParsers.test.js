import { test, describe } from 'node:test'
import { deepEqual, equal } from 'node:assert/strict'
import { parseSplats, parseQueryParams } from './UrlParsers.js'
import { config } from '../config.js'

test('parseQueryParams', () => {
	const searchParams = parseQueryParams('/api/foo?limit=123')
	equal(searchParams.get('limit'), '123')
})


describe('parseSplats', () => {
	test('one splat', () => {
		const splats = parseSplats(
			'/api/company/123',
			`${config.mocksDir}/api/company/[companyId].GET.200.js`
		)
		deepEqual(splats, {
			companyId: '123'
		})
	})

	test('one splat with trailing slash', () => {
		const splats = parseSplats(
			'/api/company/123/',
			`${config.mocksDir}/api/company/[companyId].GET.200.js`
		)
		deepEqual(splats, {
			companyId: '123'
		})
	})

	test('two splats and comment', () => {
		const splats = parseSplats(
			'/api/company/123/user/456',
			`${config.mocksDir}/api/company/[companyId]/user/[userId](comments).GET.200.js`
		)
		deepEqual(splats, {
			companyId: '123',
			userId: '456',
		})
	})

	test('ignores query string', () => {
		const splats = parseSplats(
			'/api/company/123?foo=456',
			`${config.mocksDir}/api/company/[companyId]?foo=[fooId].GET.200.js`
		)
		deepEqual(splats, {
			companyId: '123'
		})
	})
})


