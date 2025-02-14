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


function selectorForCheckbox(method, urlMask, checkboxClass) {
	return `tr[data-method="${method}"][data-urlMask="${urlMask}"] .${checkboxClass} input[type=checkbox]`
}

export async function clickDelayCheckbox(method, urlMask) {
	await clickCheckbox(selectorForCheckbox(method, urlMask, 'DelayToggler'))
}
export async function click500Checkbox(method, urlMask) {
	await clickCheckbox(selectorForCheckbox(method, urlMask, 'InternalServerErrorToggler'))
}
export async function clickProxiedCheckbox(method, urlMask) {
	await clickCheckbox(selectorForCheckbox(method, urlMask, 'ProxyToggler'))
}

export async function clickSaveProxiedCheckbox() {
	await clickCheckbox(`.FallbackBackend input[type=checkbox]`)
}

async function clickCheckbox(selector) {
	await page.waitForSelector(selector)
	await page.$eval(selector, el => el.click())
}

export async function typeFallbackBackend(serverAddress) {
	const input = '.FallbackBackend input[type=url]'
	await page.waitForSelector(input)
	await page.type(input, serverAddress)
	await page.$eval(input, el => el.blur())
}
