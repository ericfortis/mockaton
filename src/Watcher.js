import { join } from 'node:path'
import { watch } from 'node:fs'
import { EventEmitter } from 'node:events'

import { config } from './config.js'
import { isFile } from './utils/fs.js'
import * as mockBrokerCollection from './mockBrokersCollection.js'


let nAR_Events = 0 // AR = Add or Remove Mock

export function countAR_Events() {
	return nAR_Events
}


const emitter = new EventEmitter()

export function subscribeAR_EventListener(callback) {
	emitter.on('AR', callback)
}
export function unsubscribeAR_EventListener(callback) {
	emitter.removeListener('AR', callback)
}

function emitAddOrRemoveMock() {
	nAR_Events++
	emitter.emit('AR')
}

export function watchMocksDir() {
	const dir = config.mocksDir
	watch(dir, { recursive: true, persistent: false }, (_, file) => {
		if (!file)
			return
		if (isFile(join(dir, file))) {
			if (mockBrokerCollection.registerMock(file, 'isFromWatcher'))
				emitAddOrRemoveMock()
		}
		else {
			mockBrokerCollection.unregisterMock(file)
			emitAddOrRemoveMock()
		}
	})
}

// TODO staticDir, config changes
// TODO think about throttling e.g. bulk deletes/remove files
