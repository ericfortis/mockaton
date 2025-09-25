import { after } from 'node:test'
import { launch } from 'puppeteer'

import { preview, build } from 'vite'
import viteConfig from '../vite.config.js'

import {
	removeDiffsAndCandidates,
	testPixels as _testPixels,
	diffServer
} from 'pixaton'
import { Commander, Mockaton } from 'mockaton'
import mockatonConfig from '../mockaton.config.js'


const mockatonServer = await Mockaton({
		...mockatonConfig,
		port: 0,
		onReady: () => {}
	})
const mockatonAddr = `http://${mockatonServer.address().address}:${mockatonServer.address().port}`
export const mockaton = new Commander(mockatonAddr)

process.env.BACKEND = mockatonAddr
await build(viteConfig)
viteConfig.server.open = false
const viteServer = await preview(viteConfig)

const VITE_ADDR = `http://localhost:${viteServer.config.preview.port}`

const testsDir = import.meta.dirname
removeDiffsAndCandidates(testsDir)
let browser
try {
	browser = await launch({ headless: 'shell' })
}
catch (error) {
	console.error(error)
	process.exit(1)
}
const page = await browser.newPage()

after(() => {
	browser?.close()
	mockatonServer?.close()
	viteServer?.close()
	diffServer(testsDir)
})

export function testPixels(testFileName, qaId, options = {}) {
	options.outputDir = testsDir
	options.beforeSuite = async () => await mockaton.reset()
	options.viewports ??= [{
		width: 740,
		height: 880,
		deviceScaleFactor: 1.5 // For higher quality screenshots
	}]
	const selector = `[data-qaid=${qaId}]`
	_testPixels(page, testFileName, VITE_ADDR, selector, options)
}
