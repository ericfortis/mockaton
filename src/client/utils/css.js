export function classNames(...args) {
	return args.filter(Boolean).join(' ')
}


export function extractClassNames({ cssRules }) {
	// Class names must begin with _ or a letter, then it can have numbers and hyphens
	// TODO think about tag.className selectors
	// TODO think about collisions with props on CSSStyleSheet (e.g. title, type, disabled, href, etc.)
	const reClassName = /(?:^|[\s,{>])&?\s*\.([a-zA-Z_][\w-]*)/g
	const cNames = {}
	let match
	for (const rule of cssRules)
		while (match = reClassName.exec(rule.cssText))
			cNames[match[1]] = match[1]
	return cNames
}
