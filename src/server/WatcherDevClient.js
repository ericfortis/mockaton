import { watch } from 'node:fs'
import { EventEmitter } from 'node:events'


export const devClientWatcher = new class extends EventEmitter {
	emit(file) { super.emit('RELOAD', file) }
	subscribe(listener) { this.once('RELOAD', listener) }
	unsubscribe(listener) { this.removeListener('RELOAD', listener) }
}

// DashboardHtml.js is not watched.
// It would need dynamic import + cache busting
export function watchDevSPA() {
	watch('src/client', (_, file) => {
		devClientWatcher.emit(file)
	})
}
