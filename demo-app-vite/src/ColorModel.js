export class ColorModel {
	/** @param item {ColorAPI} */
	constructor(item) {
		this.name = item.name ?? ''

		this.isValid = this.#isValid(item.color)
		this.color = this.isValid
			? item.color
			: this.#invalidColorStripes
		this.isDark = this.#isDark()

		this.stock = item.stock ?? 0
		this.stockFormatted = Intl.NumberFormat().format(this.stock)
		this.inStock = Boolean(this.stock)

		this.isNew = Boolean(item.is_new)
		this.discontinued = Boolean(item.discontinued)
	}

	#invalidColorStripes = 'repeating-linear-gradient(-45deg, #fff, #fff 4px, #fee 4px, #fee 8px)'

	#isValid(color) {
		return typeof color === 'string' &&
			/^#[\da-f]{6}$/i.test(color)
	}

	#isDark() {
		if (!this.isValid)
			return false
		const MID_GREY = 137
		const c = parseInt(this.color.substring(1), 16)
		const r = 0.299 * ((c & 0xff0000) >> 16)
		const g = 0.587 * ((c & 0xff00) >> 8)
		const b = 0.114 * (c & 0xff)
		return MID_GREY > (r + g + b)
	}
}


