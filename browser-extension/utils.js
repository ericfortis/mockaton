export function removeTrailingSlash(url = '') {
	return url.replace(/\/$/, '')
}


// https://stackoverflow.com/a/19328891
export function download(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = createElement('a', {
    href: url,
    download: filename
  })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}


export function createElement(tag, props, ...children) {
	const elem = document.createElement(tag)
	for (const [k, v] of Object.entries(props || {}))
		if (k === 'ref') v.elem = elem
		else if (k === 'style') Object.assign(elem.style, v)
		else if (k.startsWith('on')) elem.addEventListener(k.slice(2).toLowerCase(), ...[v].flat())
		else if (k in elem) elem[k] = v
		else elem.setAttribute(k, v)
	elem.append(...children.flat().filter(Boolean))
	return elem
}


export function timestampString() {
	return new Date().toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	})
		.replace(/[\/\\:*?"<>|]/g, '-')
		.replace(/,?\s+/g, '_')
}


export const mime = new class {
	#mimeToExt = {}

	constructor() {
		for (const [ext, mime] of Object.entries(this.#extToMime))
			this.#mimeToExt[mime] = ext

		// aliases
		this['text/javascript'] = 'js'
	}

	extensionFor(mimeType) {
		return this.#mimeToExt[mimeType] || 'unknown'
	}

	#extToMime = {
		'3g2': 'video/3gpp2',
		'3gp': 'video/3gpp',
		'7z': 'application/x-7z-compressed',
		aac: 'audio/aac',
		abw: 'application/x-abiword',
		apng: 'image/apng',
		arc: 'application/x-freearc',
		avi: 'video/x-msvideo',
		avif: 'image/avif',
		azw: 'application/vnd.amazon.ebook',
		bin: 'application/octet-stream',
		bmp: 'image/bmp',
		bz2: 'application/x-bzip2',
		bz: 'application/x-bzip',
		cda: 'application/x-cdf',
		cjs: 'text/javascript',
		csh: 'application/x-csh',
		css: 'text/css',
		csv: 'text/csv',
		doc: 'application/msword',
		docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		eot: 'application/vnd.ms-fontobject',
		epub: 'application/epub+zip',
		gif: 'image/gif',
		gz: 'application/gzip',
		htm: 'text/html',
		html: 'text/html',
		ico: 'image/vnd.microsoft.icon',
		ics: 'text/calendar',
		jar: 'application/java-archive',
		jpeg: 'image/jpeg',
		jpg: 'image/jpeg',
		js: 'application/javascript',
		json: 'application/json',
		jsonld: 'application/ld+json',
		mid: 'audio/midi',
		midi: 'audio/midi',
		mjs: 'text/javascript',
		mp3: 'audio/mpeg',
		mp4: 'video/mp4',
		mpeg: 'video/mpeg',
		mpkg: 'application/vnd.apple.installer+xml',
		odp: 'application/vnd.oasis.opendocument.presentation',
		ods: 'application/vnd.oasis.opendocument.spreadsheet',
		odt: 'application/vnd.oasis.opendocument.text',
		oga: 'audio/ogg',
		ogv: 'video/ogg',
		ogx: 'application/ogg',
		opus: 'audio/ogg',
		otf: 'font/otf',
		pdf: 'application/pdf',
		php: 'application/x-httpd-php',
		png: 'image/png',
		ppt: 'application/vnd.ms-powerpoint',
		pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
		rar: 'application/vnd.rar',
		rtf: 'application/rtf',
		sh: 'application/x-sh',
		svg: 'image/svg+xml',
		tar: 'application/x-tar',
		tif: 'image/tiff',
		ts: 'video/mp2t',
		ttf: 'font/ttf',
		txt: 'text/plain',
		vsd: 'application/vnd.visio',
		wav: 'audio/wav',
		weba: 'audio/webm',
		webm: 'video/webm',
		webp: 'image/webp',
		woff2: 'font/woff2',
		woff: 'font/woff',
		xhtml: 'application/xhtml+xml',
		xls: 'application/vnd.ms-excel',
		xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		xml: 'application/xml',
		xul: 'application/vnd.mozilla.xul+xml',
		yaml: 'application/yaml',
		yml: 'application/yaml',
		zip: 'application/zip'
	}
}
