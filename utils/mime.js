// https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
const mimes = {
	aac: 'audio/acc',
	apng: 'image/apng',
	avif: 'image/avif',
	css: 'text/css',
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
	jpeg: 'image/jpeg',
	jpg: 'image/jpeg',
	js: 'application/javascript',
	json: 'application/json',
	jsonld: 'application/ld+json',
	md: 'text/markdown',
	mjs: 'text/javascript',
	mp3: 'audio/mpeg',
	mp4: 'video/mp4',
	oft: 'font/otf',
	pdf: 'application/pdf',
	png: 'image/png',
	ttf: 'font/ttf',
	txt: 'plain/text',
	wav: 'audio/wav',
	weba: 'audio/webm',
	webm: 'video/webm',
	webp: 'image/webp',
	woff2: 'font/woff2',
	woff: 'font/woff',
	xml: 'application/xml',
	zip: 'application/zip'
}

export function mimeFor(filename) {
	const ext = filename.replace(/.*\./, '')
	const mime = mimes[ext] || ''
	if (!mime)
		console.error(`Missing MIME for ${filename}`)
	return mime
}