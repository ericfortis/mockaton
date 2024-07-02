const isTypeOf = example => value =>
	Object.prototype.toString.call(value) ===
	Object.prototype.toString.call(example)

const typeCheckers = new Map([
	[Date, isTypeOf(new Date())],
	[Array, isTypeOf([])],
	[String, isTypeOf('')],
	[Object, isTypeOf({})],
	[Number, isTypeOf(1)],
	[RegExp, isTypeOf(/a/)],
	[Boolean, isTypeOf(true)],
	[Function, isTypeOf(a => a)]
])


export function validate(obj, shape) {
	for (const [field, value] of Object.entries(obj)) {
		const validator = shape[field]
		if (typeCheckers.has(validator)) {
			if (!typeCheckers.get(validator)(value))
				throw new TypeError(`${field} ${value}`)
		}
		else if (!validator(value))
			throw new TypeError(`${field} ${value}`)
	}
}
