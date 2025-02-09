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
		height: 800
	}]
	options.colorSchemes ??= ['light', 'dark']
	_testPixels(page, testFileName, MOCKATON_ADDR + '/mockaton', 'body', options)
}


export async function selectFromDropdown({ qaId, target }) {
	const selector = `select[data-qaid="${qaId}"]`
	await page.waitForSelector(selector)
	await page.click(selector) // Just for showing focus state
	await page.select(selector, target)
}

export async function clickLinkByText(linkText) {
	const selector = `a ::-p-text(${linkText})`
	await page.waitForSelector(selector)
	await page.locator(selector).click()
}


export async function clickDelayCheckbox(checkboxNamePrefix) {
	await clickCheckbox({
		parentClassName: 'DelayToggler',
		checkboxNamePrefix
	})
}

export async function click500Checkbox(checkboxNamePrefix) {
	await clickCheckbox({
		parentClassName: 'InternalServerErrorToggler',
		checkboxNamePrefix
	})
}
export async function clickProxiedCheckbox(checkboxNamePrefix) {
	await clickCheckbox({
		parentClassName: 'ProxyToggler',
		checkboxNamePrefix
	})
}

export async function clickSaveProxiedCheckbox() {
	await clickCheckbox({
		parentClassName: 'FallbackBackend'
	})
}

async function clickCheckbox({ parentClassName, checkboxNamePrefix = '' }) {
	const checkbox = checkboxNamePrefix
		? `.${parentClassName} input[type=checkbox][name^="${checkboxNamePrefix}"]`
		: `.${parentClassName} input[type=checkbox]`
	await page.waitForSelector(checkbox)
	await page.$eval(checkbox, el => el.click())
}

export async function typeFallbackBackend(serverAddress) {
	const input = '.FallbackBackend input[type=url]'
	await page.waitForSelector(input)
	await page.type(input, serverAddress)
	await page.$eval(input, el => el.blur())
}
