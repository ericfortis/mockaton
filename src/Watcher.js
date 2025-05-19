import { join } from 'node:path'
import { watch } from 'node:fs'
import { EventEmitter } from 'node:events'

import { config } from './config.js'
import { isFile } from './utils/fs.js'
import * as mockBrokerCollection from './mockBrokersCollection.js'


/** # AR = Add or Remove Mock */
export const arEvents = new class extends EventEmitter {
	count = 0

	emit() {
		this.count++
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
				arEvents.emit()
		}
		else {
			mockBrokerCollection.unregisterMock(file)
			arEvents.emit()
		}
	})
}

// TODO staticDir, config changes
// TODO think about throttling e.g. bulk deletes/remove files
