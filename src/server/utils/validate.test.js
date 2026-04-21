import { describe, test } from 'node:test'
import { doesNotThrow, throws } from 'node:assert/strict'
import { validate, is } from './validate.js'


describe('validate', () => {
	describe('is', () => {
		test('rejects mismatched type', () =>
			throws(() =>
					validate({ foo: 1 }, { foo: is(String) }),
				/foo=1\nExpected String/))

		test('accepts matched type', () =>
			doesNotThrow(() =>
				validate({ foo: '' }, { foo: is(String) })))
	})

	describe('custom tester func', () => {
		test('rejects mismatched type', () =>
			throws(() =>
					validate({ foo: 'not-a-number' }, { foo: n => Number.isInteger(n) ? '' : 'Expected Integer' }),
				/foo="not-a-number"\nExpected Integer/))

		test('rejects mismatched value', () =>
			throws(() =>
					validate({ foo: 0 }, { foo: n => n === 1 ? '' : 'Expected 1' }),
				/foo=0\nExpected 1/))

		test('accepts matched type', () =>
			doesNotThrow(() =>
				validate({ foo: 1 }, { foo: v => !Number.isInteger(v) })))
	})
})
