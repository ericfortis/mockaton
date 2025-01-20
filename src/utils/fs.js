import { join, dirname, sep, posix } from 'node:path'
import { lstatSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'


export const isFile = path => lstatSync(path, { throwIfNoEntry: false })?.isFile()
export const isDirectory = path => lstatSync(path, { throwIfNoEntry: false })?.isDirectory()

export const read = path => readFileSync(path)

/** @returns {Array<string>} paths relative to `dir` */
export const listFilesRecursively = dir => {
	const files = readdirSync(dir, { recursive: true }).filter(f => isFile(join(dir, f)))
	return process.platform === 'win32'
		? files.map(f => f.replaceAll(sep, posix.sep)) // TESTME
		: files
}

export const write = (path, body) => {
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, body)
}
