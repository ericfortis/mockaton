import { API } from './ApiConstants.js'


let es = null
let timer = null

window.addEventListener('beforeunload', teardown)
connect()
function connect() {
	if (es) return

	clearTimeout(timer)
	es = new EventSource(API.watchHotReload)

	es.onmessage = function (event) {
		const file = event.data
		if (file.endsWith('.css'))
			hotReloadCSS(file)
		else if (file)
			location.reload()
	}

	es.onerror = function () {
		console.error('hot reload')
		teardown()
		timer = setTimeout(connect, 3000)
	}
}

function teardown() {
	clearTimeout(timer)
	es?.close()
	es = null
}

async function hotReloadCSS(file) {
	const mod = await import(`./${file}?${Date.now()}`, { with: { type: 'css' } })
	document.adoptedStyleSheets = [mod.default]
}
