export function validate(obj, shape) {
	for (const [field, value] of Object.entries(obj))
		if (!shape[field](value))
			throw new TypeError(`config.${field}=${JSON.stringify(value)} is invalid`)
}

export const is = ctor => val => val.constructor === ctor
export const optional = tester => val => !val || tester(val)
