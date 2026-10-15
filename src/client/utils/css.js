export function classNames(...args) {
	return args.filter(Boolean).join(' ')
}


export function adoptSheet(sheet, url) {
	sheet.__url = url.replace(/^\.\//, '')
	document.adoptedStyleSheets.push(sheet)
	Object.assign(sheet, extractClassNames(sheet))
}

// Think of this function as an imperfect alternative to CSS Modules tooling.
// Its purpose is to let us use IDE tooling for autocomplete and refactoring.
// Caveats:
//  - class names can collide with existing props on CSSStyleSheet such as: title, type, disabled, href
//  - selectors in the form of tag.className are ignored
//  - doesn't ensure uniqueness
export function extractClassNames({ cssRules }) {
	// class names begin with _ or a letter, then it can have numbers and hyphens
	const reClassName = /(?:^|[\s,{>])&?\s*\.([a-zA-Z_][\w-]*)/g
	const cNames = {}
	let match
	for (const { cssText } of cssRules)
		while (match = reClassName.exec(cssText))
			cNames[match[1]] = match[1]
	return cNames
}
