// This mock is used for stress testing the syntaxJSON highlighter. Currently,
// we stop syntax highlighting after N nodes. Experimentally on an M4
// Pro in Chrome, that value caps complex renderings to just under 300ms.

const MAX_HIGHLIGHTED_NODES = 50_000

export default function () {
	const linksList = {}
	const MAX_HIGHLIGHTED_KVs = MAX_HIGHLIGHTED_NODES / 7
	let i = 0
	for (; i <= MAX_HIGHLIGHTED_KVs; i++)
		linksList[i] = [ // 7 syntax nodes 
			'http://example.test/a',
			'http://example.test/b'
		]
	for (; i <= MAX_HIGHLIGHTED_KVs + 100; i++)
		linksList[i] = [
			'http://example.test/should_not_syntax_highlight_a',
			'http://example.test/should_not_syntax_highlight_b'
		]
	return JSON.stringify(linksList, null, 2)
}
