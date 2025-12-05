// TODO use copy btn instead
;(function doubleClickToSelectAllPre() {
	for (const pre of document.querySelectorAll('pre'))
		pre.addEventListener('dblclick', function () {
			selectAllContents(pre)
		}, false)

	function selectAllContents(node) {
		try {
			const range = document.createRange()
			range.selectNodeContents(node)
			const selection = window.getSelection()
			selection.removeAllRanges()
			selection.addRange(range)
		}
		catch {}
	}
}())


;(function AddRelNoOpener() {
	for (const link of document.querySelectorAll('a'))
		link.rel = 'noopener'
}())
