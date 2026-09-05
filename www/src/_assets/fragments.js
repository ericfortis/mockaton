;(function () {
	document.querySelectorAll('h2:not([id]), h3:not([id])')
		.forEach(prependAnchor)

	function prependAnchor(hElem) {
		const a = document.createElement('a')
		a.id = idFor(hElem.innerText)
		a.href = '#' + a.id
		a.onclick = highlightParent
		hElem.prepend(a)
	}

	function idFor(content) {
		return '-' + content.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
			.replace(/ /g, '-')
	}

	const cHighlight = 'highlight'
	let highlightedElem = null
	let highlightTimer = null

	if (location.hash)
		highlightParent.call(document.querySelector(location.hash))

	function highlightParent() {
		const el = this?.parentNode
		if (!el) return
		if (highlightedElem) {
			highlightedElem.classList.remove(cHighlight)
			clearTimeout(highlightTimer)
		}
		el.classList.add(cHighlight)
		highlightedElem = el
		highlightTimer = setTimeout(() => {
			highlightedElem.classList.remove(cHighlight)
			highlightedElem = null
		}, 1800)
	}
}())
