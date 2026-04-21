import { htmlTemplate, socialMetadata } from './_htmlTemplate.js'

// language=html
export default (url) => htmlTemplate({
	head: socialMetadata('Related Tech', '', url),
	body: `
		<h1>Related Tech</h1>
		<br />
		<p>
			Mockaton wins overall, but it’s worth knowing the strengths of related tools.
			For instance, start with Burp, Charles Proxy, and JSON Server.
			Also, if you use StoryBook for testing non-core components, learn about
			MSW (you can map MSW to the Mockaton file structure, so you can
			get the benefits of both).
		</p>

		<h2 id="proxy-like">
			Proxy-like
		</h2>
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


		<h2 id="server-side">
			Server Side
		</h2>
		<ul>
			<li><a href="https://github.com/wiremock/wiremock">Wire Mock</a></li>
			<li><a href="https://www.telerik.com/fiddler">Fiddler</a></li>
			<li><a href="https://github.com/typicode/json-server">JSON Server</a></li>
			<li><a href="https://swagger.io">Swagger</a></li>
			<li><a href="https://mockoon.com">Mockoon</a></li>
			<li><a href="https://github.com/dhuan/mock">Mock</a></li>
		</ul>


		<h2 id="client-side">
			Client Side <span class="normalWeight">(Service Worker)</span>
		</h2>
		<p>
			In contrast to Mockaton, which is an HTTP Server, these programs
			intercept your browser’s requests (or Node’s). Since they use a
			Service Worker, by design, they inherit their limitations.
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
