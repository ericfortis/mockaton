import { watch } from 'node:fs'
import { EventEmitter } from 'node:events'
import { DASHBOARD_ASSETS } from './Api.js'


export const devWatcher = new class extends EventEmitter {
	emit(file) { super.emit('RELOAD', file) }
	subscribe(listener) { this.once('RELOAD', listener) }
	unsubscribe(listener) { this.removeListener('RELOAD', listener) }
}

// DashboardHtml.js is not watched.
// It would need dynamic import + cache busting
export function watchDevSPA() {
	watch('src', (_, file) => {
		if (DASHBOARD_ASSETS.includes(file))
			devWatcher.emit(file)
	})
}
