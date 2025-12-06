;(function Navigation() {
	document.querySelector(`nav a[href="${window.location.pathname}"]`)
		.classList.add('active')
}())


;(function HamburgerToggle() {
	document.querySelector('button.Hamburger')
		.addEventListener('click', () => {
			document.querySelector('nav').classList.toggle('visible')
		})
}())

;(function injectNextDocPageLink() {
	const [href, text] = findNextLink()
	if (!href) return
	const link = createElement('a', {
			className: 'NextDocLink',
			href
		},
		createElement('span', null, 'Next: '),
		createElement('strong', null, text),
		createElement('span', null, '   ⇾'),
	)
	document.body.insertBefore(link, document.querySelector('footer'))

	function findNextLink() {
		const { pathname } = window.location
		const next = document.querySelector(`nav a[href="${pathname}"]`)
			?.closest('li')
			?.nextElementSibling
			?.querySelector('a')
		return next 
			? [next.href, next.textContent] 
			: []
	}
}())

function createElement(tag, props, ...children) {
	const elem = document.createElement(tag)
	for (const [k, v] of Object.entries(props || {}))
		if (k === 'ref') v.elem = elem
		else if (k === 'style') Object.assign(elem.style, v)
		else if (k.startsWith('on')) elem.addEventListener(k.slice(2).toLowerCase(), ...[v].flat())
		else if (k in elem) elem[k] = v
		else elem.setAttribute(k, v)
	elem.append(...children.flat().filter(Boolean))
	return elem
}
