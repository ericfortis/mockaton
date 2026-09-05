;(function () {
	document.querySelectorAll('h2:not([id]), h3:not([id])')
		.forEach(insertHeadingLink)

	function insertHeadingLink(h) {
		const a = document.createElement('a')
		a.id = '-' + buildId(h.innerText)
		a.href = '#' + a.id
		a.addEventListener('click', highlightSectionTitle)
		h.prepend(a)
	}

	function buildId(content = '') {
		return content.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
			.replace(/ /g, '-')
	}

	const cHighlight = 'highlight'
	let elPendingHighlightOff = null
	let highlightTimer = null

	if (location.hash)
		highlightSectionTitle.call(document.querySelector(location.hash))

	function highlightSectionTitle(linkEl) {
		const el = this?.parentNode
		if (!el) return
		if (elPendingHighlightOff) {
			elPendingHighlightOff.classList.remove(cHighlight)
			clearTimeout(highlightTimer)
		}
		el.classList.add(cHighlight)
		elPendingHighlightOff = el
		highlightTimer = setTimeout(() => {
			el.classList.remove(cHighlight)
			elPendingHighlightOff = null
		}, 1800)
	}
}())
