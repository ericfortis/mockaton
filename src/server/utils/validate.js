export function validate(obj, shape) {
	for (const [field, value] of Object.entries(obj))
		try {
			const err = shape[field](value)
			if (err)
				throw err
		}
		catch (err) {
			throw new TypeError(`${field}=${JSON.stringify(value)}\n${err}`)
		}
}

export function is(ctor) {
	return val => val.constructor === ctor
		? ''
		: `Expected ${ctor.prototype.constructor.name}`
}

export function isInt(min = Number.MAX_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
	return v => Number.isInteger(v) && v >= min && v <= max
		? ''
		: `Expected an integer between ${min} and ${max}`
}

export function isFloat(min = Number.MAX_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
	return v => Number.isFinite(v) && v >= min && v <= max
		? ''
		: `Expected a float between ${min} and ${max}`
}

export function isOneOf(...vals) {
	return v => vals.includes(v)
		? ''
		: `Expected one of: ${vals.join(', ')}`
}

export function optionalURL(v) {
	return !v || URL.canParse(v)
		? ''
		: 'Expected an empty String or URL'
}
