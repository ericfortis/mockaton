import { join } from 'node:path'
import { after } from 'node:test'
import { launch } from 'puppeteer'
import { devConfig } from '../dev-config.js'
import { Commander, Mockaton } from '../index.js'
import { removeDiffsAndCandidates, testPixels as _testPixels, diffServer } from 'pixaton'


const isGHA = process.env.GITHUB_ACTIONS === 'true'

let mockatonServer
await new Promise(resolve => {
	mockatonServer = Mockaton({
		...devConfig,
		port: 0,
		onReady: resolve
	})
})
const mockatonAddr = `http://${mockatonServer.address().address}:${mockatonServer.address().port}`
const mockaton = new Commander(mockatonAddr)

const testsDir = isGHA // TODO env var
	? join(import.meta.dirname, 'ubuntu')
	: join(import.meta.dirname, 'macos')

removeDiffsAndCandidates(testsDir)
let browser
try {
	browser = await launch({
		headless: 'shell',
		args: ['--no-sandbox', '--disable-setuid-sandbox'] // For GHA
	})
}
catch (error) {
	console.error(error)
}
const page = await browser.newPage()

after(() => {
	browser?.close()
	mockatonServer?.close()
	if (!isGHA)
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
	options.outputDir = testsDir
	_testPixels(page, testFileName, mockatonAddr + '/mockaton', 'body', options)
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
	await page.waitForFunction(selector => !document.querySelector(selector)?.disabled,
		{ polling: 'mutation' }, selector)
	await page.$eval(selector, el => el.click())
}

export async function typeFallbackBackend(serverAddress) {
	const el = await page.waitForSelector('.FallbackBackend input[type=url]')
	await el.type(serverAddress)
	await el.evaluate(el => el.blur())
}
