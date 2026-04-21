import Prism from 'prismjs'
import loadLanguages from 'prismjs/components/index.js'

loadLanguages(['json', 'shell'])

const fnT = Prism.languages.shell['function']
fnT.pattern = new RegExp(fnT.pattern.source.replace('|npm|', '|npm|npx|'), fnT.pattern.flags)

Prism.hooks.add('wrap', env => {
	env.classes = [`syntax_${env.type}`]
})

function prismFactory(language) {
	return (input, wrap = true) => {
		const txt = Array.isArray(input) ? input[0] : input
		const value = Prism.highlight(txt.trim(), Prism.languages[language], language)
		return wrap
			? raw(value)
			: value
	}
}

export const js = prismFactory('javascript')
export const json = prismFactory('json')
export const shell = prismFactory('shell')

export const raw = txt =>
	`<pre><code>${txt.trim()}</code></pre>`
