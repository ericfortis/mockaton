import { existsSync as exists, lstatSync } from 'node:fs'


export function validate(obj, shape) {
	for (const [field, value] of Object.entries(obj))
		if (!shape[field](value))
			throw new TypeError(`${field} ${value}`)
}

export const is = ctor => val => val.constructor === ctor
export const optional = tester => val => !val || tester(val)
export const isDirectory = dir => exists(dir) && lstatSync(dir).isDirectory()
