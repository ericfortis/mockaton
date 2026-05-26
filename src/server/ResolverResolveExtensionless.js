import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'


export async function resolve(specifier, context, nextResolve) {
	try {
		return await nextResolve(specifier, context)
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
}
