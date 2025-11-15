import { join, dirname, sep, posix } from 'node:path'
import { lstatSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'

import { logger } from './logger.js'


export const isFile = path => lstatSync(path, { throwIfNoEntry: false })?.isFile()
export const isDirectory = path => lstatSync(path, { throwIfNoEntry: false })?.isDirectory()

/** @returns {Array<string>} paths relative to `dir` */
export const listFilesRecursively = dir => {
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

export const write = (path, body) => {
	try {
		mkdirSync(dirname(path), { recursive: true })
		writeFileSync(path, body)
	}
	catch (err) {
		logger.warn('Write access denied', err)
	}
}
