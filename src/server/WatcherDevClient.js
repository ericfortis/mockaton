import { join } from 'node:path'
import { EventEmitter } from 'node:events'
import { watch, readdirSync } from 'node:fs'
import { config } from './config.js'
import { LONG_POLL_SERVER_TIMEOUT } from './ApiConstants.js'


export const CLIENT_DIR = join(import.meta.dirname, '../client')
export const DASHBOARD_ASSETS = readdirSync(CLIENT_DIR)


const devClientWatcher = new class extends EventEmitter {
	emit(file) { super.emit('RELOAD', file) }
	subscribe(listener) { this.once('RELOAD', listener) }
	unsubscribe(listener) { this.removeListener('RELOAD', listener) }
}


// Although `client/indexHtml.js` is watched, it returns a stale version.
// i.e., it would need to be a dynamic import + cache busting.
export function watchDevSPA() {
	watch(CLIENT_DIR, (_, file) => {
		devClientWatcher.emit(file)
	})
}


/** Realtime notify Dev UI changes */
export function longPollDevClientHotReload(req, response) {
	if (!config.hotReload) {
		response.notFound()
		return
	}
	
	function onDevChange(file) {
		devClientWatcher.unsubscribe(onDevChange)
		response.json(file)
	}
	response.setTimeout(LONG_POLL_SERVER_TIMEOUT, () => {
		devClientWatcher.unsubscribe(onDevChange)
		response.json('')
	})
	req.on('error', () => {
		devClientWatcher.unsubscribe(onDevChange)
		response.destroy()
	})
	devClientWatcher.subscribe(onDevChange)
}
