import { htmlTemplate, socialMetadata } from './_htmlTemplate.js'

// language=html
export default (url) => htmlTemplate({
	head: socialMetadata('Related Tech', '', url),
	body: `
		<h1>Related Tech</h1>
		<br />
		<p>
			Before listing alternatives to Mockaton, lets summarize its
			differentiators besides the dashboard.
		</p>

		<h2>Why Mockaton is best overall?</h2>

		<h3>No vendor lock-in</h3>
		<p>
			By design, it doesn't live in your code. There’s no need to
			write code to integrate it.
		</p>

		<h3>It’s a real server</h3>
		<p>
			It‘s not limited to browsers, and in browsers it doesn‘t have the
			limitations Service Worker alternatives have. For example, you
			can test cookies and anticipate CORS problems. Also, you don‘t
			have to write exclusion rules for requests that aren‘t related
			to your API.
		</p>
		<p>
			By the same token, you can change API states without risking 
			your frontend state.
		</p>

		<h3>Privacy and security</h3>
		<ul>
			<li>Zero dependencies, which mitigates the common supply chain attacks on the NPM ecosystem.</li>
			<li>
				Does not hijack your browsers' requests (it’s not a Service Worker).
			</li>
			<li>
				Does not write to disk. Except when you select ✅ <strong>Save Mocks</strong>
				for scraping mocks from a backend, or when you add mocks via the API.
				Both can be disabled by <code>config.readOnly</code>.
				Also, writes are limited to the <code>config.mocksDir</code>.
			</li>
			<li>Does not initiate network connections (no logs, no telemetry).</li>
		</ul>

		<h3>Auditable and easy to modify and maintain</h3>
		<p>
			The code is organized and small.
			The server is under 2 KLoC.
		</p>


		<hr />
		<h2 id="proxy-like">
			Alternatives
		</h2>

		<h3 id="proxy-like">Proxy-like</h3>
		<p>
			These are similar to Mockaton in the sense that you can modify the
			mock response without losing or risking your frontend code state. For
			example, if you are polling, and you want to test the state change.
		</p>

		<ul>
			<li>
				Chrome DevTools allows for <a
				href="https://developer.chrome.com/docs/devtools/overrides">
				overriding responses</a>.
			</li>
			<li>
				Reverse Proxies such as <a href="https://portswigger.net/burp">Burp</a>
				are also handy for overriding responses. Not easy but very powerful.
			</li>
			<li><a href="https://www.mitmproxy.org/">mimtproxy</a></li>
			<li><a href="https://httptoolkit.com/">HTTP Toolkit</a></li>
			<li><a href="https://proxyman.com/">Proxyman</a></li>
			<li><a href="https://www.charlesproxy.com/">Charles Proxy</a></li>
		</ul>


		<h3 id="server-side">Server side</h3>
		<ul>
			<li><a href="https://github.com/wiremock/wiremock">Wire Mock</a></li>
			<li><a href="https://www.telerik.com/fiddler">Fiddler</a></li>
			<li><a href="https://github.com/typicode/json-server">JSON Server</a></li>
			<li><a href="https://swagger.io">Swagger</a></li>
			<li><a href="https://mockoon.com">Mockoon</a></li>
			<li><a href="https://github.com/dhuan/mock">Mock</a></li>
		</ul>


		<h3 id="client-side">
			Client side <span class="normalWeight">(Service Worker)</span>
		</h3>
		<p>
			Mockaton has a sister testing library <a href="http://github.com/ericfortis/pixaton">Pixaton</a>
			for testing UI regression by taking screenshots and pixel diffing them. Give it a try
			too, it’s also open source, and runs locally and much faster than commercial alternatives.
			Like 12 times faster.
		</p>
		
		<p>
			Having said that, many teams use MSW, so they can use Storybook, so they can
			use an expensive and slow screenshot SASS. In those cases, keep in mind
			that you can organize your mocks in a directory structure that mimicks your
			API endpoints. That way you can use Mockaton and MSW side-by-side.
		</p>
		<ul>
			<li><a href="https://mswjs.io">MSW</a></li>
			<li><a href="https://github.com/nock/nock">Nock</a></li>
			<li><a href="https://github.com/wheresrhys/fetch-mock">Fetch Mock</a></li>
			<li><a href="https://github.com/humanwhocodes/mentoss">Mentoss</a></li>
			<li><a href="https://github.com/miragejs/miragejs">MirageJS</a></li>
		</ul>
	`
})
