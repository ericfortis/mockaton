import { join } from 'node:path'
import { after } from 'node:test'
import { launch } from 'puppeteer'

import devConfig from '../mockaton.config.js'
import { Commander, Mockaton } from '../index.js'
import { removeDiffsAndCandidates, testPixels as _testPixels, diffServer } from 'pixaton'


const mockatonServer = await Mockaton({
	...devConfig,
	port: 0,
	onReady: () => {}
})
const mockatonAddr = `http://${mockatonServer.address().address}:${mockatonServer.address().port}`
export const mockaton = new Commander(mockatonAddr)

const testsDir = join(import.meta.dirname, 'macos')

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
	diffServer(testsDir)
})

export function testPixels(testFileName, options = {}) {
	options.beforeSuite ??= async () => {
		await mockaton.reset()
	}
	options.viewports ??= [{
		width: 1024,
		height: 800
	}]
	options.colorSchemes ??= ['light']
	options.outputDir = testsDir
	_testPixels(page, testFileName, mockatonAddr + '/mockaton', 'body', options)
}


export async function clickLinkByText(linkText) {
	const selector = `a ::-p-text(${linkText})`
	await page.waitForSelector(selector)
	await page.locator(selector).click()
}
