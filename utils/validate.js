export function validate(obj, shape) {
	for (const [field, value] of Object.entries(obj)) {
		const validator = shape[field]
		if (isTypeOf(validator, Function) && validator !== Function) {
			if (!validator(value))
				throw new TypeError(`${field} ${value}`)
		}
		else if (!isTypeOf(validator, value))
			throw new TypeError(`${field} ${value}`)
	}
}

function isTypeOf(example, value) {
	return (
		Object.prototype.toString.call(value) ===
		Object.prototype.toString.call(example))
}