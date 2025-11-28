;(function () {
	const CSS = {
		Server: 'Server',
		CopyButton: 'CopyButton',
	}

	// Server Input
	document.querySelector('#ServerInput').addEventListener('change', function () {
		this.reportValidity()
		if (this.validity.valid)
			for (const s of document.getElementsByClassName(CSS.Server))
				s.innerText = this.value.trim()
	})
	document.querySelector('form').addEventListener('submit', function (event) {
		event.preventDefault()
		this.querySelector('input').dispatchEvent(new Event('change'))
	})

	// COPY Button
	for (const b of document.getElementsByClassName(CSS.CopyButton))
		b.addEventListener('click', function () {
			let prev
			do {
				prev = this.previousElementSibling
			} while (prev && prev.tagName !== 'PRE')

			try {
				if (prev)
					navigator.clipboard.writeText(prev.innerText)
			}
			catch {}
		})
}())
