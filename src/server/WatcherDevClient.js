import { join } from 'node:path'
import { EventEmitter } from 'node:events'
import { watch, readdirSync } from 'node:fs'

import { config } from './config.js'


export const CLIENT_DIR = join(import.meta.dirname, '../client')
export const DASHBOARD_ASSETS = readdirSync(CLIENT_DIR, { recursive: true })


const devClientWatcher = new class extends EventEmitter {
	emit(file) { super.emit('RELOAD', file) }
	subscribe(listener) { this.on('RELOAD', listener) }
	unsubscribe(listener) { this.removeListener('RELOAD', listener) }
}


// Although `client/IndexHtml.js` is watched, it returns a stale version.
// i.e., it would need to be a dynamic import + cache busting.
export function watchDevSPA() {
	watch(CLIENT_DIR, (_, file) => {
		devClientWatcher.emit(file)
	})
}


/** Realtime notify Dev UI changes */
export function sseClientHotReload(req, response) {
	if (!config.hotReload) {
		response.notFound()
		return
	}

	response.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive',
	})
	response.flushHeaders()

	function onDevChange(file = '') {
		response.write(`data: ${file}\n\n`)
	}

	devClientWatcher.subscribe(onDevChange)

	const keepAlive = setInterval(() => {
		response.write(': ping\n\n')
	}, 10_000)

	req.on('close', cleanup)
	req.on('error', cleanup)
	function cleanup() {
		clearInterval(keepAlive)
		devClientWatcher.unsubscribe(onDevChange)
	}
}
