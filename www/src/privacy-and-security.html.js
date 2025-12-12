const { htmlTemplate } = await import(`./_htmlTemplate.js?${Date.now()}`)

// language=html
export default () => htmlTemplate({
	head: `<title>Privacy and Security</title>`,
	body: `
		<h1>Privacy and Security</h1>
		
		<p>
			Mockaton is designed to work offline and standalone.
		</p>

		<ul>
			<li>Does not hijack your browsers' network requests (it’s not a Service Worker, it’s an HTTP server).</li>
			<li>Does not write to disk. Except when you select ✅ <strong>Save Mocks</strong> for scraping mocks from a backend.</li>
			<li>Does not initiate network connections (no logs, no telemetry).</li>
			<li>Auditable:
				<ul>
					<li>Organized and small. 4 KLoC (half is UI and tests).</li>
					<li>Zero dependencies. No runtime and no build packages.</li>
				</ul>
			</li>
		</ul>
	`
})
