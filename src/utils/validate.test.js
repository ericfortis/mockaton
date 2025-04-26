import { describe, it } from 'node:test'
import { doesNotThrow, throws } from 'node:assert/strict'
import { validate, is, optional } from './validate.js'


describe('validate', () => {
	describe('optional', () => {
		it('accepts undefined', () =>
			doesNotThrow(() =>
				validate({}, {
					myOpt: optional(Number.isInteger)
				})))

		it('accepts falsy value regardless of type', () =>
			doesNotThrow(() =>
				validate({ myOpt: 0 }, {
					myOpt: optional(Array.isArray)
				})))

		it('accepts when tester func returns truthy', () =>
			doesNotThrow(() =>
				validate({ myOpt: [] }, {
					myOpt: optional(Array.isArray)
				})))

		it('rejects when tester func returns falsy', () =>
			throws(() =>
				validate({ myOpt: 1 }, {
					myOpt: optional(Array.isArray)
				}), /config.myOpt=1 is invalid/))
	})

	describe('is', () => {
		it('rejects mismatched type', () =>
			throws(() =>
				validate({ myStr: 1 }, {
					myStr: is(String)
				}), /config.myStr=1 is invalid/))

		it('accepts matched type', () =>
			doesNotThrow(() =>
				validate({ myStr: 1 }, {
					myStr: is(Number)
				})))
	})

	describe('custom tester func', () => {
		it('rejects mismatched type', () =>
			throws(() =>
				validate({ myInt: 0.1 }, {
					myInt: Number.isInteger
				}), /config.myInt=0.1 is invalid/))

		it('accepts matched type', () =>
			doesNotThrow(() =>
				validate({ myInt: 1 }, {
					myInt: Number.isInteger
				})))
	})
})
