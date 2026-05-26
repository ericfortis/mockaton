import { join } from 'node:path'
import { watch } from 'node:fs'
import { EventEmitter } from 'node:events'

import { config } from './config.js'
import * as brokers from './brokers.js'
import { isFile, isDirectory } from '../utils/fs.js'


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

export function emitChange() {
	uiSyncVersion.increment()
}


export function watchMocksDir() {
	const dir = config.mocksDir
	mocksWatcher = mocksWatcher || watch(dir, { recursive: true, persistent: false }, (_, file) => {
		if (!file)
			return

		if (isDirectory(join(dir, file))) {
			brokers.init()
			uiSyncVersion.increment()
		}
		else if (!isFile(join(dir, file))) { // file deleted
			brokers.unregisterMock(file)
			uiSyncVersion.increment()
		}
		else if (brokers.registerMock(file, Boolean('isFromWatcher')))
			uiSyncVersion.increment()
		else {
			// ignore file edits
		}
	})
	mocksWatcher?.on('error', () => {
		// on linux, subdir deletion can trigger inotify IN_IGNORED
	})
}

export function unwatchMocksDir() {
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


	sendVersion()
	uiSyncVersion.subscribe(sendVersion)

	function sendVersion() {
		response.write(`data: ${uiSyncVersion.version}\n\n`)
	}

	const keepAlive = setInterval(() => {
		response.write(': ping\n\n')
	}, 10_000)

	req.on('close', cleanup)
	req.on('error', cleanup)
	response.on('error', cleanup)
	function cleanup() {
		clearInterval(keepAlive)
		uiSyncVersion.unsubscribe(sendVersion)
	}
}


