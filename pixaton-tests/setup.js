import { join } from 'node:path'
import { after } from 'node:test'

import { launch } from 'puppeteer'
import { removeDiffsAndCandidates, diffServer } from 'pixaton'

import devConfig from '../mockaton.config.js'
import { Commander, Mockaton } from '../index.js'


const testsDir = join(import.meta.dirname, 'tests')
export const outputDir = join(import.meta.dirname, 'tests', 'macos')

const mServer = await Mockaton({
	...devConfig,
	port: 0,
	logLevel: 'quiet',
	hotReload: false,
	watcherEnabled: false,
	bypassImportCache: false,
	onReady() {}
})
export const mockaton = new Commander(
	`http://${mServer.address().address}:${mServer.address().port}`)


removeDiffsAndCandidates(testsDir)

let browser
try {
	browser = await launch({ headless: false })
}
catch (err) {
	console.error(err)
	process.exit(1)
}

export const page = await browser.newPage()

after(() => {
	browser?.close()
	mServer?.close()
	diffServer(testsDir)
})
