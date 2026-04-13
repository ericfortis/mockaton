class TrieNode {
	constructor() {
		this.items = []
		this.kids = new Map()
	}
}

// TODO it should ignore query string

/**
 * @typedef {{method: string, urlMask:string, children: BrokerLite[]}} BrokerLite
 * @param {BrokerLite[]} brokers
 * @returns {BrokerLite[]}
 */
export function dirStructure(brokers) {
	const root = new TrieNode()

	for (let b of brokers) {
		let curr = root
		for (const seg of b.urlMask.split('/').filter(Boolean)) {
			if (!curr.kids.has(seg))
				curr.kids.set(seg, new TrieNode())
			curr = curr.kids.get(seg)
		}
		curr.items.push(b)
	}

	const result = []
	for (const child of root.kids.values())
		result.push(...convertNode(child))

	if (root.items.length) {
		const elems = [root.items[0], ...result]
		for (let i = 1; i < root.items.length; i++)
			elems.push(root.items[i])

		const parentNode = elems[0]
		for (let i = 1; i < elems.length; i++)
			parentNode.children.push(elems[i])

		return [parentNode]
	}

	return result
}

/**
 * Recursively converts a TrieNode into a flattened, nested array of objects.
 * Flattens the tree by having the first available route at a given directory level
 * act as the parent wrapper for the remaining items and subdirectories.
 *
 * @param {TrieNode} node
 * @returns {BrokerLite[]}
 */
function convertNode(node) {
	const childNodes = []
	for (const child of node.kids.values())
		childNodes.push(...convertNode(child))

	const elems = []
	if (node.items.length) {
		elems.push(node.items[0])
		elems.push(...childNodes)
		for (let i = 1; i < node.items.length; i++)
			elems.push(node.items[i])
	}
	else
		elems.push(...childNodes)

	if (!elems.length)
		return []

	const parentNode = elems[0]

	if (node.items.length || !parentNode.children.length) {
		for (let i = 1; i < elems.length; i++)
			parentNode.children.push(elems[i])
		return [parentNode]
	}

	return elems
}

