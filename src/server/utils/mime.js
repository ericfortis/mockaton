import { config } from '../config.js'
import { UNKNOWN_MIME_EXT } from '../ApiConstants.js'


// Generated with:
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
// m = {}
// for (const row of tbody.children)
//  m[row.children[0].querySelector('code').innerText] = row.children[2].querySelector('code').innerText

const extToMime = {
	'3g2': 'video/3gpp2',
	'3gp': 'video/3gpp',
	'3mf': 'model/3mf',
	'7z': 'application/x-7z-compressed',
	aac: 'audio/aac',
	abw: 'application/x-abiword',
	aif:  'audio/aiff',
	aifc: 'audio/aiff',
	aiff: 'audio/aiff',
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
	dae: 'model/vnd.collada+xml',
	doc: 'application/msword',
	docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	drc: 'model/vnd.draco',
	eml: 'message/rfc822',
	eot: 'application/vnd.ms-fontobject',
	epub: 'application/epub+zip',
	exe: 'application/vnd.microsoft.portable-executable',
	fbx: 'application/octet-stream',
	flac: 'audio/flac',
	gif: 'image/gif',
	glb: 'model/gltf-binary',
	gltf: 'model/gltf+json',
	gz: 'application/gzip',
	heic: 'image/heic',
	heif: 'image/heif',
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
	lz:   'application/x-lzip',
	m4a: 'audio/mp4',
	map: 'application/json',
	md:  'text/markdown',
	mid: 'audio/midi',
	midi: 'audio/midi',
	mjs: 'text/javascript',
	mkv: 'video/x-matroska',
	mov: 'video/quicktime',
	mp3: 'audio/mpeg',
	mp4: 'video/mp4',
	mpeg: 'video/mpeg',
	mpkg: 'application/vnd.apple.installer+xml',
	mtl: 'text/plain',
	obj: 'text/plain',
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
	ply: 'application/octet-stream',
	png: 'image/png',
	ppt: 'application/vnd.ms-powerpoint',
	pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	rar: 'application/vnd.rar',
	rtf: 'application/rtf',
	sh: 'application/x-sh',
	stl: 'model/stl',
	svg: 'image/svg+xml',
	tar: 'application/x-tar',
	tif: 'image/tiff',
	ts: 'video/mp2t',
	ttf: 'font/ttf',
	txt: 'text/plain',
	usd: 'model/vnd.usd',
	usdz: 'model/vnd.usdz+zip',
	vsd: 'application/vnd.visio',
	wasm: 'application/wasm',
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
	xz:   'application/x-xz',
	yaml: 'application/yaml',
	yml: 'application/yaml',
	zip: 'application/zip',
	zst:  'application/zstd'
}

const mimeToExt = mapMimeToExt(extToMime)

function mapMimeToExt(e2m) {
	const m = {}
	for (const [ext, mime] of Object.entries(e2m))
		m[mime] = ext
	return m
}

export function mimeFor(filename) {
	const ext = extname(filename).toLowerCase()
	return config.extraMimes[ext] || extToMime[ext] || ''
}
function extname(filename) {
	const i = filename.lastIndexOf('.')
	return i === -1
		? ''
		: filename.slice(i + 1)
}


export function extFor(mime) {
	return mime
		? findExt(mime)
		: 'empty'
}
function findExt(rawMime) {
	const m = parseMime(rawMime)
	const extraMimeToExt = mapMimeToExt(config.extraMimes)
	return extraMimeToExt[m] || mimeToExt[m] || UNKNOWN_MIME_EXT
}

export function parseMime(mime) {
	return mime.split(';')[0].toLowerCase()
	// RFC 9110 §8.3.1
}
