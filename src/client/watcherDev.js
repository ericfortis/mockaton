import { API } from './ApiConstants.js'


let conn = null
let timer = null

window.addEventListener('beforeunload', teardown)
connect()
function connect() {
	if (conn) return

	clearTimeout(timer)
	conn = new EventSource(API.watchHotReload)

	conn.onmessage = function (event) {
		const file = event.data
		if (file.endsWith('.css'))
			hotReloadCSS(file)
		else if (file)
			location.reload()
	}

	conn.onerror = function () {
		console.error('hot reload')
		teardown()
		timer = setTimeout(connect, 3000)
	}
}

function teardown() {
	clearTimeout(timer)
	conn?.close()
	conn = null
}

async function hotReloadCSS(file) {
	const mod = await import(`./${file}?${Date.now()}`, { with: { type: 'css' } })
	document.adoptedStyleSheets = [mod.default]
}
