import { lstatSync, readdirSync } from 'node:fs'
import { join, dirname, sep, posix, resolve } from 'node:path'
import { mkdir, writeFile, unlink, realpath } from 'node:fs/promises'


export const isFile = path => lstatSync(path, { throwIfNoEntry: false })?.isFile()
export const isDirectory = path => lstatSync(path, { throwIfNoEntry: false })?.isDirectory()


/** @returns {Array<string>} paths relative to `dir` */
export function listFilesRecursively(dir) {
	try {
		const files = readdirSync(dir, { recursive: true }).filter(f => isFile(join(dir, f)))
		return process.platform === 'win32'
			? files.map(f => f.replaceAll(sep, posix.sep))
			: files
	}
	catch (err) { // e.g. ENOENT
		return []
	}
}

export async function write(path, body) {
	await mkdir(dirname(path), { recursive: true })
	await writeFile(path, body)
}

export async function rm(path) {
	await unlink(path)
}


/** @returns {string | null} absolute path if it’s within `baseDir` */
export async function resolveIn(baseDir, file) {
	try {
		const parent = await realpath(baseDir)
		const child = resolve(join(parent, file))
		return child.startsWith(join(parent, sep))
			? child
			: null
	}
	catch (e) {
		return null
	}
}
