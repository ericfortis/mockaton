import { existsSync } from 'node:fs'
import { resolve as _resolve, join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const mockatonSrcRoot = `file://${_resolve(import.meta.dirname, '..')}`

// We register this hook at runtime so it doesn’t interfere with non-dynamic imports. 
export async function resolve(specifier, context, nextResolve) {
	let result
	try {
		result = await nextResolve(specifier, context)
	}
	catch (error) {
		// Attempt to resolve imports as .ts and .js
		if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && context.parentURL) {
			const absPath = join(dirname(fileURLToPath(context.parentURL)), specifier)
			for (const candidate of ['.ts', '.js'].map(ext => absPath + ext))
				if (existsSync(candidate))
					return resolve(pathToFileURL(candidate).href, context, nextResolve)
		}
		throw error
	}

	// Cache bust by appending timestamp query param
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
