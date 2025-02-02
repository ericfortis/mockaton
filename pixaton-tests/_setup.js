import { after } from 'node:test'
import { launch } from 'puppeteer'
import {
	removeDiffsAndCandidates,
	testPixels as _testPixels,
	diffServer
} from 'pixaton'
import { Commander } from '../index.js'

// Before running these tests you need to spin up the demo:
//   npm run start

const MOCKATON_ADDR = 'http://localhost:2345'
const mockaton = new Commander(MOCKATON_ADDR)

const testsDir = import.meta.dirname

removeDiffsAndCandidates(testsDir)
const browser = await launch({ headless: true })
const page = await browser.newPage()

after(() => {
	browser?.close()
	diffServer(testsDir)
})

export function testPixels(testFileName, options = {}) {
	options.beforeSuite = async () => {
		await mockaton.reset()
		await mockaton.setProxyFallback('')
		await mockaton.setCollectProxied(false)
	}
	options.viewports ??= [{
		width: 1024,
		height: 800,
		deviceScaleFactor: 1.5 // for better screenshots
	}]
	options.colorSchemes ??= ['light', 'dark']
	options.screenshotOptions ??= {}
	_testPixels(page, testFileName, MOCKATON_ADDR + '/mockaton', 'body', options)
}
