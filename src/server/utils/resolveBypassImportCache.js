import { realpathSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function bypassImportCache(srcPath) {
	const resolvedSrcPath = pathToFileURL(realpathSync(srcPath)).href

	// We register this `resolve` hook at runtime so it doesn't interfere with non-dynamic imports.
	return function resolve(specifier, context, nextResolve) {
		const result = nextResolve(specifier, context)
		if (result.url.startsWith(resolvedSrcPath)) {
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
}
