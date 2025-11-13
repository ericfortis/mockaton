import { describe, test } from 'node:test'
import { doesNotThrow, throws } from 'node:assert/strict'
import { validate, is, optional } from './validate.js'


describe('validate', () => {
	describe('optional', () => {
		test('accepts undefined', () =>
			doesNotThrow(() =>
				validate({}, { field: optional(Number.isInteger) })))

		test('accepts falsy value regardless of type', () =>
			doesNotThrow(() =>
				validate({ field: 0 }, { field: optional(Array.isArray) })))

		test('accepts when tester func returns truthy', () =>
			doesNotThrow(() =>
				validate({ field: [] }, { field: optional(Array.isArray) })))

		test('rejects when tester func returns falsy', () =>
			throws(() =>
					validate({ field: 1 }, { field: optional(Array.isArray) }),
				/field=1 is invalid/))
	})

	describe('is', () => {
		test('rejects mismatched type', () =>
			throws(() =>
					validate({ field: 1 }, { field: is(String) }),
				/field=1 is invalid/))

		test('accepts matched type', () =>
			doesNotThrow(() =>
				validate({ field: '' }, { field: is(String) })))
	})

	describe('custom tester func', () => {
		test('rejects mismatched type', () =>
			throws(() =>
					validate({ field: 0.1 }, { field: Number.isInteger }),
				/field=0.1 is invalid/))

		test('accepts matched type', () =>
			doesNotThrow(() =>
				validate({ field: 1 }, { field: Number.isInteger })))
	})
})
