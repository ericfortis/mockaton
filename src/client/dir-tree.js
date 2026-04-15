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


// -------


/**
 * @param {Partial<BrokerRowModel>[]} brokers
 * @returns {Partial<BrokerRowModel>[]}
 */
export function dirStructure(brokers) {
	return dfs(trie(brokers))
}

function trie(brokers) {
	const root = new TrieNode()
	for (const b of brokers) {
		let node = root
		for (const seg of b.urlMask.split('/')) { // TODO it should ignore query string
			const segNode = node.tnChildren.get(seg) || new TrieNode()
			node.tnChildren.set(seg, segNode)
			node = segNode
		}
		node.brokers.push(b)
	}
	return root
}

function TrieNode() {
	this.brokers = []
	this.tnChildren = new Map()
}

/** @param {TrieNode} node */
function dfs(node) {
	const childBrokers = []
	for (const tnc of node.tnChildren.values())
		childBrokers.push(...dfs(tnc))

	const brokers = node.brokers.length
		? [node.brokers[0], ...childBrokers, ...node.brokers.slice(1)]
		: childBrokers

	if (!brokers.length)
		return []

	const [head, ...rest] = brokers
	if (node.brokers.length || !head.children.length) {
		head.children.push(...rest)
		return [head]
	}
	return brokers
}

