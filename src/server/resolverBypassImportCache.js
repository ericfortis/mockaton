import { resolve as _resolve } from 'node:path'

const mockatonSrcRoot = `file://${_resolve(import.meta.dirname, '..')}`

// We register this hook at runtime so it doesn’t interfere with non-dynamic imports. 
// Cache bust by appending timestamp query param
export async function resolve(specifier, context, nextResolve) {
	const result = await nextResolve(specifier, context)
	if (result.url?.startsWith('file://') && !result.url.startsWith(mockatonSrcRoot)) {
		const url = new URL(result.url)
		url.searchParams.set('t', performance.now())
		return {
			...result,
			url: url.href,
			shortCircuit: true
		}
	}
	return result
}
