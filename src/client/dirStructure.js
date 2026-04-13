function TrieNode() {
	this.items = []
	this.kids = new Map()
}

// TODO it should ignore query string

/**
 * @param {Partial<BrokerRowModel>[]} brokers
 * @returns {Partial<BrokerRowModel>[]}
 */
export function dirStructure(brokers) {
	const root = new TrieNode()

	for (const b of brokers) {
		let node = root
		for (const seg of b.urlMask.split('/')) {
			if (!node.kids.has(seg))
				node.kids.set(seg, new TrieNode())
			node = node.kids.get(seg)
		}
		node.items.push(b)
	}

	const result = []
	for (const c of root.kids.values())
		result.push(...convert(c))

	return root.items.length
		? [merge(root.items, result)]
		: result
}

function convert(node) {
	const children = []
	for (const c of node.kids.values())
		children.push(...convert(c))

	const elems = node.items.length
		? [node.items[0], ...children, ...node.items.slice(1)]
		: children

	if (!elems.length)
		return []

	const [head, ...rest] = elems
	if (node.items.length || !head.children.length) {
		head.children.push(...rest)
		return [head]
	}
	return elems
}

function merge(items, children) {
	const [head, ...rest] = items
	if (children.length || rest.length)
		head.children.push(...children, ...rest)
	return head
}
