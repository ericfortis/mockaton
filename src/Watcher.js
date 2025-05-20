import { join } from 'node:path'
import { watch } from 'node:fs'
import { EventEmitter } from 'node:events'

import { config } from './config.js'
import { isFile } from './utils/fs.js'
import * as mockBrokerCollection from './mockBrokersCollection.js'


/** # AR = Add or Remove Mock Event */
export const uiSyncVersion = new class extends EventEmitter {
	version = 0

	increment() {
		this.version++
		super.emit('AR')
	}
	subscribe(listener) {
		this.once('AR', listener)
	}
	unsubscribe(listener) {
		this.removeListener('AR', listener)
	}
}

export function watchMocksDir() {
	const dir = config.mocksDir
	watch(dir, { recursive: true, persistent: false }, (_, file) => {
		if (!file)
			return
		if (isFile(join(dir, file))) {
			if (mockBrokerCollection.registerMock(file, 'isFromWatcher'))
				uiSyncVersion.increment()
		}
		else {
			mockBrokerCollection.unregisterMock(file)
			uiSyncVersion.increment()
		}
	})
}

// TODO staticDir, config changes
// TODO think about throttling e.g. bulk deletes/remove files
