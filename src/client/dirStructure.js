function TrieNode() {
	this.brokers = []
	this.tnChildren = new Map()
}

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
