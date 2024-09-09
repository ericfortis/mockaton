import { lstatSync, readFileSync } from 'node:fs'


export const isFile = path => lstatSync(path, { throwIfNoEntry: false })?.isFile()
export const isDirectory = path => lstatSync(path, { throwIfNoEntry: false })?.isDirectory()

export const read = path => readFileSync(path)
