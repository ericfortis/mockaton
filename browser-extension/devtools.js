import { files } from './files.js'
import { download, createElement as r } from './utils.js'


const CSS = {
	ClearList: null,
	DownloadAll: null,
	FileList: null,
	Filter: null,
	FilterIsRegex: null,
	UseMockatonExt: null
}
for (const k of Object.keys(CSS))
	CSS[k] = k

const t = translation => translation[0]


chrome.devtools.panels
	.create(t`Mockaton Downloader`, '', 'panel.html', panel => {
		panel.onShown.addListener(function renderOnce(win) {
			panel.onShown.removeListener(renderOnce)
			win.document.body.append(App())
		})
	})

chrome.devtools.network.onNavigated
	.addListener(renderList)

chrome.devtools.network.onRequestFinished
	.addListener(function register(req) {
		const { url, method } = req.request
		const { status, content: { mimeType } } = req.response

		if (url.startsWith('data:')) return
		if (status !== 200) return // e.g. Partial Content (206) or Cached (304)

		req.getContent((body, encoding) => {
			const data = encoding === 'base64'
				? Uint8Array.fromBase64(body)
				: body
			files.insert(url, method, status, mimeType, data)
			renderList()
		})
	})


// The domain is used for naming the top-level folder when saving to disk
const domainName = await new Promise(resolve => {
	chrome.devtools.inspectedWindow
		.eval('window.location.host', (result, isException) => {
			if (!isException)
				resolve(result)
		})
})



const fileListRef = {}

function App() {
	return (
		r('div', null,
			r('menu', null,

				r('label', { className: CSS.Filter }, t`Filter`,
					r('input', {
						onKeyUp() {
							files.setFilter(this.value)
							renderList()
						}
					})),

				r('label', { className: CSS.FilterIsRegex },
					r('input', {
						type: 'checkbox',
						onChange() {
							files.toggleFilterIsRegex()
							renderList()
						}
					}),
					t`RegExp?`),

				r('label', { className: CSS.UseMockatonExt },
					r('input', {
						type: 'checkbox',
						checked: files.useMockatonExt,
						onChange() {
							files.toggleUseMockatonExt()
							renderList()
						}
					}),
					t`Use Mockaton’s file extension convention`),

				r('button', {
						type: 'button',
						className: CSS.DownloadAll,
						onClick() {
							files.saveAll(domainName)
						}
					},
					t`Download All`),

				r('button', {
						type: 'button',
						className: CSS.ClearList,
						onClick() {
							files.clearList()
							renderList()
						}
					},
					t`Clear`)),

			r('ul', {
				ref: fileListRef,
				className: CSS.FileList
			})))
}


function renderList() {
	if (!fileListRef.elem)
		return

	const frag = new DocumentFragment()
	for (const [key, filename] of files.listFiltered())
		frag.appendChild(
			r('li', null,
				r('button', {
						type: 'button',
						onClick() {
							download(filename, files.blobFor(key))
						}
					},
					filename)))

	fileListRef.elem.replaceChildren(frag)
}
