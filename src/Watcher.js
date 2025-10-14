import { join } from 'node:path'
import { watch } from 'node:fs'
import { EventEmitter } from 'node:events'

import { config } from './config.js'
import { isFile, isDirectory } from './utils/fs.js'
import * as staticCollection from './staticCollection.js'
import * as mockBrokerCollection from './mockBrokersCollection.js'


/** # ARR = Add, Remove, or Rename Mock Event */
export const uiSyncVersion = new class extends EventEmitter {
	version = 0

	increment() {
		this.version++
		super.emit('ARR')
	}
	subscribe(listener) {
		this.once('ARR', listener)
	}
	unsubscribe(listener) {
		this.removeListener('ARR', listener)
	}
}

export function watchMocksDir() {
	const dir = config.mocksDir
	watch(dir, { recursive: true, persistent: false }, (_, file) => {
		if (!file)
			return
		
		const path = join(dir, file)

		if (isDirectory(path)) {
			mockBrokerCollection.init()
			uiSyncVersion.increment()
			return
		}

		if (isFile(path)) {
			if (mockBrokerCollection.registerMock(file, Boolean('isFromWatcher')))
				uiSyncVersion.increment()
		}
		else {
			mockBrokerCollection.unregisterMock(file)
			uiSyncVersion.increment()
		}
	})
}

export function watchStaticDir() {
	const dir = config.staticDir
	if (!dir)
		return
	watch(dir, { recursive: true, persistent: false }, (_, file) => {
		if (!file)
			return
		
		const path = join(dir, file)

		if (isDirectory(path)) {
			staticCollection.init()
			uiSyncVersion.increment()
			return
		}

		if (isFile(path)) {
			if (staticCollection.registerMock(file))
				uiSyncVersion.increment()
		}
		else {
			staticCollection.unregisterMock(file)
			uiSyncVersion.increment()
		}
	})
}

// TODO config changes
// TODO think about throttling e.g. bulk deletes/remove files
