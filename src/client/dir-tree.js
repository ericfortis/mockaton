/**
 * Think of this as a way of printing a directory tree in which
 * the repeated folder paths are kept but styled differently.
 * @param {string[]} paths - sorted
 */
export function dittoSplitPaths(paths) {
	const pParts = paths.map(p => p.split('/').filter(Boolean))
	return paths.map((p, i) => {
		if (i === 0)
			return ['', p]

		const prev = pParts[i - 1]
		const curr = pParts[i]
		const min = Math.min(curr.length, prev.length)
		let j = 0
		while (j < min && curr[j] === prev[j])
			j++

		if (!j) // no common dirs
			return ['', p]

		const ditto = '/' + curr.slice(0, j).join('/') + '/'
		return [ditto, p.slice(ditto.length)]
	})
}



/**
 * @param {Partial<BrokerRowModel>[]} brokers
 * @returns {Partial<BrokerRowModel>[]}
 */
export function groupByFolder(brokers) {
	return dfs(trie(brokers))
}

function trie(brokers) {
	const root = new TrieNode()
	for (const b of brokers) {
		let node = root
		for (const seg of b.urlMask.split('/')) { // TODO it should ignore query string
			const segNode = node.getChild(seg) || new TrieNode()
			node.addChild(seg, segNode)
			node = segNode
		}
		node.brokers.push(b)
	}
	return root
}

class TrieNode {
	#children = new Map()
	brokers = []
	addChild(k, v) { this.#children.set(k, v) }
	getChild(k) { return this.#children.get(k) }
	getChildren() { return this.#children.values() }
}

/** @param {TrieNode} node */
function dfs(node) {
	const childBrokers = []
	for (const tnc of node.getChildren())
		childBrokers.push(...dfs(tnc))

	const brokers = node.brokers.length
		? [node.brokers[0], ...childBrokers, ...node.brokers.slice(1)]
		: childBrokers

	if (!brokers.length)
		return []

	const [b0, ...rest] = brokers
	if (node.brokers.length || !b0.children.length) {
		b0.children.push(...rest)
		return [b0]
	}
	return brokers
}

