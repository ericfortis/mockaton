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
	onReady() {}
})
export const mockaton = new Commander(
	`http://${mServer.address().address}:${mServer.address().port}`)


removeDiffsAndCandidates(testsDir)
const browser = await launch({ headless: false })
export const page = await browser.newPage()

after(() => {
	browser?.close()
	mServer?.close()
	diffServer(testsDir)
})
