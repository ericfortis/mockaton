import { test } from 'node:test'
import { equal } from 'node:assert/strict'
import { page } from '../setup.js'
import pkgJSON from '../../package.json' with { type: 'json' }
import { clickBySelector, getBySelector, testPixels } from '../utils.js'


const MENU_SEL = '#_settings_menu_'

async function onVersionTag(cb) {
	await clickBySelector('.MenuTrigger')
	const vTag = await getBySelector(`${MENU_SEL} p:last-of-type`)
	return page.evaluate(cb, vTag)
}


test('renders version', async () => {
	const ver = await onVersionTag(el => el.textContent)
	equal(ver, 'v' + pkgJSON.version)
})


await testPixels(import.meta.filename, {
	selector: MENU_SEL,
	async setup() {
		// Replaces the version with a steady one
		await onVersionTag(el => el.textContent = 'v0.0.1')
	}
})

