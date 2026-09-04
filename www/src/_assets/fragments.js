;(function insertHeadingIds() {
	for (const h of document.querySelectorAll('h2:not([id]), h3:not([id])'))
		h.id = '-' + buildId(h.innerText)

	function buildId(content = '') {
		return content.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
			.replace(/ /g, '-')
	}
}())
