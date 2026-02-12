// We register this hook at runtime so it doesn’t interfere with non-dynamic imports. 
export async function resolve(specifier, context, nextResolve) {
	const result = await nextResolve(specifier, context)
	if (result.url?.startsWith('file:')) {
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
