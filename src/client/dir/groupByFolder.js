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
			if (node.hasChild(seg))
				node = node.getChild(seg)
			else {
				const segNode = new TrieNode()
				node.setChild(seg, segNode)
				node = segNode
			}
		}
		node.brokers.push(b)
	}
	return root
}

/** @param {TrieNode} node */
function dfs(node) {
	const childBrokers = node.getChildren().flatMap(dfs)

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

class TrieNode {
	#children = new Map()
	brokers = []
	setChild(k, v) { this.#children.set(k, v) }
	hasChild(k) { return this.#children.has(k) }
	getChild(k) { return this.#children.get(k)}
	getChildren() { return Array.from(this.#children.values()) }
}
