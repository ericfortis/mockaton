const url = new URL(import.meta.url).searchParams.get('url')

if (!url)
	console.warn('Missing ?url=')
else
	init()

function init() {
	let conn = null
	let timer = null

	connect()
	window.addEventListener('beforeunload', teardown)

	function connect() {
		if (conn) return

		clearTimeout(timer)
		conn = new EventSource(url)

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
		const mod = await import(`${document.baseURI}${file}?${Date.now()}`, { with: { type: 'css' } })
		document.adoptedStyleSheets = [mod.default]
	}
}
