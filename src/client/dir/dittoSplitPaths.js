/**
 * Think of this as a way of printing a directory tree in which
 * the repeated folder paths are kept but styled differently.
 * @param {string[]} paths - sorted
 */
export function dittoSplitPaths(paths) {
	const pParts = paths.map(p => p.split('/').filter(Boolean))
	return paths.map((p, i) => {
		if (i === 0)
			return ['', p]

		const prev = pParts[i - 1]
		const curr = pParts[i]
		const min = Math.min(curr.length, prev.length)
		let j = 0
		while (j < min && curr[j] === prev[j])
			j++

		if (!j) // no common dirs
			return ['', p]

		const ditto = '/' + curr.slice(0, j).join('/') + '/'
		return [ditto, p.slice(ditto.length)]
	})
}
