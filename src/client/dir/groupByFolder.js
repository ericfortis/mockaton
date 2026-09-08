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

	if (node.brokers.length) {
		const [b0, ...rest] = node.brokers
		b0.children.push(...childBrokers, ...rest)
		return [b0]
	}

	if (childBrokers.length && !childBrokers[0].children.length) {
		const [b0, ...rest] = childBrokers
		b0.children.push(...rest)
		return [b0]
	}

	return childBrokers
}

class TrieNode {
	#children = new Map()
	brokers = []
	setChild(k, v) { this.#children.set(k, v) }
	hasChild(k) { return this.#children.has(k) }
	getChild(k) { return this.#children.get(k)}
	getChildren() { return Array.from(this.#children.values()) }
}
