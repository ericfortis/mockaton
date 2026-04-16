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

