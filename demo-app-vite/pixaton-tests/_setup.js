import { after } from 'node:test'
import { launch } from 'puppeteer'
import {
	removeDiffsAndCandidates,
	testPixels as _testPixels,
	diffServer
} from 'pixaton'
import { Commander } from 'mockaton'

// Before running these tests you need to 
// spin up Mockaton and the App

const MOCKATON_ADDR = 'http://localhost:2345'
const VITE_ADDR = 'http://localhost:3030'

export const mockaton = new Commander(MOCKATON_ADDR)

const testsDir = import.meta.dirname

removeDiffsAndCandidates(testsDir)
const browser = await launch({ headless: true })
const page = await browser.newPage()

after(() => {
	browser?.close()
	diffServer(testsDir)
})

export function testPixels(testFileName, qaId, options = {}) {
	options.beforeSuite = async () => await mockaton.reset()
	options.viewports ??= [{
		width: 500,
		height: 800,
		deviceScaleFactor: 1.5 // For higher quality screenshots
	}]
	const selector = `[data-qaid=${qaId}]`
	_testPixels(page, testFileName, VITE_ADDR, selector, options)
}
