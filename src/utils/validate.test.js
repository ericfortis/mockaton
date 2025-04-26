import { describe, it } from 'node:test'
import { doesNotThrow, throws } from 'node:assert/strict'
import { validate, is, optional } from './validate.js'


describe('validate', () => {
	describe('optional', () => {
		it('accepts undefined', () =>
			doesNotThrow(() =>
				validate({}, { field: optional(Number.isInteger) })))

		it('accepts falsy value regardless of type', () =>
			doesNotThrow(() =>
				validate({ field: 0 }, { field: optional(Array.isArray) })))

		it('accepts when tester func returns truthy', () =>
			doesNotThrow(() =>
				validate({ field: [] }, { field: optional(Array.isArray) })))

		it('rejects when tester func returns falsy', () =>
			throws(() =>
					validate({ field: 1 }, { field: optional(Array.isArray) }),
				/config.field=1 is invalid/))
	})

	describe('is', () => {
		it('rejects mismatched type', () =>
			throws(() =>
					validate({ field: 1 }, { field: is(String) }),
				/config.field=1 is invalid/))

		it('accepts matched type', () =>
			doesNotThrow(() =>
				validate({ field: '' }, { field: is(String) })))
	})

	describe('custom tester func', () => {
		it('rejects mismatched type', () =>
			throws(() =>
					validate({ field: 0.1 }, { field: Number.isInteger }),
				/config.field=0.1 is invalid/))

		it('accepts matched type', () =>
			doesNotThrow(() =>
				validate({ field: 1 }, { field: Number.isInteger })))
	})
})
