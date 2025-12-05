const { htmlTemplate } = await import(`./_htmlTemplate.js?${Date.now()}`)

// language=html
export default () => htmlTemplate({
	head: `<title>Scraping Mocks</title>`,
	body: `
		<h1>Scraping Mocks from your Backend</h1>

		<h2 id="option-1-browser-extension">
			Option 1: Browser Extension
		</h2>
		<p>
			The companion Chrome <a
			href="https://chromewebstore.google.com/detail/mockaton-downloader/babjpljmacbefcmlomjedmgmkecnmlaa" target="_blank">devtools
			extension</a> lets you download all the HTTP responses
			and save them in bulk following Mockaton’s filename convention.
		</p>

		<div class="RegionImg">
			<img src="static/media/browser-extension-overview.png" alt="">
		</div>

		<h2 id="option-2-fallback-to-your-backend">
			Option 2: Fallback to your Backend
		</h2>

		<p>
			This option could be a bit elaborate if your backend uses third-party authentication,
			because you’d have to manually inject cookies or <code>sessionStorage</code> tokens.
		</p>
		<p>
			On the other hand, proxying to your backend is straightforward if your backend
			handles the session cookie, or if you can develop without auth.
		</p>
		<p>
			Either way you can forward requests to your backend for routes you don’t have
			mocks for, or routes that have the ☁️ <strong>Cloud Checkbox</strong> checked. In addition, by
			checking ✅ <strong>Save Mocks</strong>, you can collect the responses that hit your backend.
			They will be saved in your <code>config.mocksDir</code> following the filename convention.
		</p>
	`
})
