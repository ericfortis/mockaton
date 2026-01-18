import { testPixels as _testPixels } from 'pixaton'
import { page, mockaton, outputDir } from './setup.js'


export function testPixels(testFileName, options = {}) {
	options.beforeSuite ??= async () => {
		await mockaton.reset()
	}
	options.viewports ??= [{
		width: 1024,
		height: 800
	}]
	options.colorSchemes ??= ['light']
	options.selector ??= 'body'
	options.outputDir = outputDir
	_testPixels(page, testFileName, mockaton.addr + '/mockaton', options.selector, options)
}


export async function clickLinkByText(linkText) {
	await clickBySelector(`a ::-p-text(${linkText})`)
}

export async function clickBySelector(selector) {
	await page.waitForSelector(selector)
	await page.locator(selector).click()
}
