import path, { join } from 'node:path'
import { lstatSync, readFileSync, readdirSync } from 'node:fs'


export const isFile = path => lstatSync(path, { throwIfNoEntry: false })?.isFile()
export const isDirectory = path => lstatSync(path, { throwIfNoEntry: false })?.isDirectory()

export const read = path => readFileSync(path)

/** @returns {Array<string>} paths relative to `dir` */
export const listFilesRecursively = dir => readdirSync(dir, { recursive: true })
	.map(f => f.replaceAll(path.sep, path.posix.sep)) // TESTME
	.filter(f => isFile(join(dir, f)))
