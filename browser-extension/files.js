import { mime, removeTrailingSlash, timestampString } from './utils.js'
import { makeUniqueUrlMask } from './makeUniqueUrlMask.js'

// Chrome doesn’t save dot-files, so we prepend them with _DOT_
function unhideDotFiles(filename) {
	return filename.replace(/\/\./g, '/_DOT_.')
}

export const files = new class {
	#filterString = ''
	#filterIsRegex = false
	#filter(filename) {
		if (!this.#filterString)
			return filename
		return this.#filterIsRegex
			? new RegExp(this.#filterString).test(filename)
			: filename.includes(this.#filterString)
	}
	setFilter(filterText) {
		this.#filterString = filterText
	}
	toggleFilterIsRegex() {
		this.#filterIsRegex = !this.#filterIsRegex
	}


	useMockatonExt = true
	toggleUseMockatonExt() {
		this.useMockatonExt = !this.useMockatonExt
	}


	#files = new Map()

	clearList() {
		this.#files.clear()
	}

	blobFor(key) {
		return this.#files.get(key).blob
	}

	insert(url, method, status, mimeType, data) {
		const { host, pathname } = new URL(url)
		const path = host + unhideDotFiles(removeTrailingSlash(pathname))
		const ext = mime.extensionFor(mimeType)
		const key = [path, method, status, ext].join('.')
		this.#files.set(key, {
			pathname: path,
			blob: new Blob([data], { type: mimeType })
		})
	}

	listFiltered() {
		return this.#makeUniqueFilenames()
			.filter(([, filename]) => this.#filter(filename))
	}

	#makeUniqueFilenames() {
		return this.useMockatonExt
			? makeUniqueUrlMask(this.#files.keys())
			: this.#files.entries().map(([key, { pathname }]) => [
				key,
				pathname
			])
	}

	async saveAll(host) {
		const folder = `${host}_${timestampString()}`
		for (const [key, filename] of this.listFiltered())
			await chrome.runtime.sendMessage({
				action: 'DOWNLOAD_FILE',
				filename: folder + '/' + filename,
				url: `data:application/octet-stream;base64,${
					new Uint8Array(await this.blobFor(key).arrayBuffer()).toBase64()}`
			})
	} // TODO handle large files (chunk)
}

