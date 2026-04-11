import { join } from 'node:path'
import { watch } from 'node:fs'
import { EventEmitter } from 'node:events'

import { config } from './config.js'
import { isFile, isDirectory } from './utils/fs.js'

import * as mockBrokerCollection from './mockBrokersCollection.js'


let mocksWatcher = null


/**
 * The emitter is debounced so it handles e.g. bulk deletes,
 * and also renames, which are two events (delete + add).
 */
export const uiSyncVersion = new class extends EventEmitter {
	version = 0

	increment = /** @type {function} */ this.#debounce(() => {
		this.version++
		super.emit('INC')
	})

	subscribe(listener) {
		this.on('INC', listener)
	}
	unsubscribe(listener) {
		this.removeListener('INC', listener)
	}

	#debounce(fn) { // TESTME 
		let timer
		return () => {
			clearTimeout(timer)
			timer = setTimeout(fn, config.watcherDebounceMs)
		}
	}
}


export function watchMocksDir() {
	const dir = config.mocksDir
	mocksWatcher = mocksWatcher || watch(dir, { recursive: true, persistent: false }, (_, file) => {
		if (!file)
			return

		if (isDirectory(join(dir, file))) {
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

export function stopMocksDirWatcher() {
	mocksWatcher?.close()
	mocksWatcher = null
}


export function sseClientSyncVersion(req, response) {
	response.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive',
	})
	response.flushHeaders()

	function sendVersion() {
		response.write(`data: ${uiSyncVersion.version}\n\n`)
	}

	sendVersion()
	uiSyncVersion.subscribe(sendVersion)

	const keepAlive = setInterval(() => {
		response.write(': ping\n\n')
	}, 10_000)

	req.on('close', cleanup)
	req.on('error', cleanup)
	function cleanup() {
		clearInterval(keepAlive)
		uiSyncVersion.unsubscribe(sendVersion)
	}
}


