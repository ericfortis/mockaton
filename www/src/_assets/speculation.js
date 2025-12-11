window.addEventListener('DOMContentLoaded', function () {
	if (HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
		// Prerender on hover. Chrome, Edge
		const spec = document.createElement('script')
		spec.type = 'speculationrules'
		spec.textContent = JSON.stringify({
			prerender: [
				{
					where: { href_matches: '/*' },
					eagerness: 'moderate'
				}
			]
		})
		document.body.append(spec)
	}
	else // Prefetch on hover. (Brave, Safari, FF)
		for (const anchor of document.querySelectorAll('a')) {
			const DELAY = 100
			const href = anchor.getAttribute('href') || ''
			if (href === window.location.pathname
				|| href.startsWith('#')
				|| href.startsWith('https://'))
				continue
			
			anchor.addEventListener('mouseenter', onMouseEnter)
			function onMouseEnter() {
				const timer = setTimeout(() => {
					anchor.removeEventListener('mouseenter', onMouseEnter)
					const el = document.createElement('link')
					el.rel = 'prefetch'
					el.href = anchor.href
					document.head.append(el)
				}, DELAY)
				anchor.addEventListener('mouseleave', () => 
					clearTimeout(timer), { once: true })
			}
		}
})
	
