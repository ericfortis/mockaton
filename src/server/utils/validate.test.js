import { describe, test } from 'node:test'
import { doesNotThrow, throws } from 'node:assert/strict'
import { validate, is, optional } from './validate.js'


describe('validate', () => {
	describe('optional', () => {
		test('accepts undefined', () =>
			doesNotThrow(() =>
				validate({}, { foo: optional(Number.isInteger) })))

		test('accepts falsy value regardless of type', () =>
			doesNotThrow(() =>
				validate({ foo: 0 }, { foo: optional(Array.isArray) })))

		test('accepts when tester func returns truthy', () =>
			doesNotThrow(() =>
				validate({ foo: [] }, { foo: optional(Array.isArray) })))

		test('rejects when tester func returns falsy', () =>
			throws(() =>
					validate({ foo: 1 }, { foo: optional(Array.isArray) }),
				/foo=1 is invalid/))
	})

	describe('is', () => {
		test('rejects mismatched type', () =>
			throws(() =>
					validate({ foo: 1 }, { foo: is(String) }),
				/foo=1 is invalid/))

		test('accepts matched type', () =>
			doesNotThrow(() =>
				validate({ foo: '' }, { foo: is(String) })))
	})

	describe('custom tester func', () => {
		test('rejects mismatched type', () =>
			throws(() =>
					validate({ foo: 'not-a-number' }, { foo: n => n > 1 }),
				/foo="not-a-number" is invalid/))

		test('rejects mismatched type', () =>
			throws(() =>
					validate({ foo: 0 }, { foo: n => n > 1 }),
				/foo=0 is invalid/))

		test('accepts matched type', () =>
			doesNotThrow(() =>
				validate({ foo: 1 }, { foo: Number.isInteger })))
	})
})
