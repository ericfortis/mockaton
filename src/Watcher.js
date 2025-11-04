import { join } from 'node:path'
import { watch } from 'node:fs'
import { EventEmitter } from 'node:events'

import { config } from './config.js'
import { isFile, isDirectory } from './utils/fs.js'
import * as staticCollection from './staticCollection.js'
import * as mockBrokerCollection from './mockBrokersCollection.js'


/**
 * ARR = Add, Remove, or Rename Mock Event
 *
 * The emitter is debounced so it handles e.g. bulk deletes,
 * and also renames, which are two events (delete + add).
 */
export const uiSyncVersion = new class extends EventEmitter {
	delay = Number(process.env.MOCKATON_WATCHER_DEBOUNCE_MS ?? 80)
	version = 0

	increment = /** @type {function} */ this.#debounce(() => {
		this.version++
		super.emit('ARR')
	})

	subscribe(listener) {
		this.once('ARR', listener)
	}
	unsubscribe(listener) {
		this.removeListener('ARR', listener)
	}

	#debounce(fn) {
		let timer
		return () => {
			clearTimeout(timer)
			timer = setTimeout(fn, this.delay)
		}
	}
}

export function watchMocksDir() {
	const dir = config.mocksDir
	watch(dir, { recursive: true, persistent: false }, (_, file) => {
		if (!file)
			return

		if (isDirectory(join(dir, file))) { // TESTME
			mockBrokerCollection.init()
			uiSyncVersion.increment()
		}
		else if (!isFile(join(dir, file))) { // file deleted
			mockBrokerCollection.unregisterMock(file)
			uiSyncVersion.increment()
		}
		else if (mockBrokerCollection.registerMock(file, Boolean('isFromWatcher')))
			uiSyncVersion.increment()
		else {
			// ignore file edits
		}
	})
}

export function watchStaticDir() { // TESTME
	const dir = config.staticDir
	if (!dir)
		return

	watch(dir, { recursive: true, persistent: false }, (_, file) => {
		if (!file)
			return

		if (isDirectory(join(dir, file))) {
			staticCollection.init()
			uiSyncVersion.increment()
		}
		else if (!isFile(join(dir, file))) { // file deleted
			staticCollection.unregisterMock(file)
			uiSyncVersion.increment()
		}
		else if (staticCollection.registerMock(file))
			uiSyncVersion.increment()
		else {
			// ignore file edits
		}
	})
}

// TODO ThinkAbout watching for config changes
