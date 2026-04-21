import { htmlTemplate, socialMetadata } from './_htmlTemplate.js'

// language=html
export default (url) => htmlTemplate({
	head: socialMetadata('Privacy and Security', '', url),
	body: `
		<h1>Privacy and Security</h1>

		<p>
			Mockaton is designed to work offline and standalone.
		</p>

		<ul>
			<li>Does not hijack your browsers' requests (it’s not a Service Worker).</li>
			<li>
				Does not write to disk. Except when you select ✅ <strong>Save Mocks</strong> for scraping mocks from a backend, or when you add mocks via the API. Both can be disabled by <code>config.readOnly</code>.
				Also, writes are limited to the <code>config.mocksDir</code>.
			</li>
			<li>Does not initiate network connections (no logs, no telemetry).</li>
			<li>Zero dependencies. No runtime and no build packages.</li>
			<li>Organized and small. The server is under 2 KLoC. UI and tests are 3&nbsp;KLoC.</li>
		</ul>
	`
})
