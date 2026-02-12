import { htmlTemplate } from './htmlTemplate.js'

// language=html
export default () => htmlTemplate({
	head: `<title>Alternatives</title>`,
	body: `
		<h1>Alternatives</h1>

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
				href="https://developer.chrome.com/docs/devtools/overrides" target="_blank">
				overriding responses</a>.
			</li>
			<li>
				Reverse Proxies such as <a href="https://portswigger.net/burp" target="_blank">Burp</a>
				are also handy for overriding responses. Not easy but very powerful.
			</li>
			<li><a href="https://www.mitmproxy.org/" target="_blank">mimtproxy</a></li>
			<li><a href="https://httptoolkit.com/" target="_blank">HTTP Toolkit</a></li>
			<li><a href="https://proxyman.com/">Proxyman</a></li>
			<li><a href="https://www.charlesproxy.com/" target="_blank">Charles Proxy</a></li>
		</ul>
		

		<h2 id="server-side">
			Server Side
		</h2>
		<ul>
			<li><a href="https://github.com/wiremock/wiremock" target="_blank">Wire Mock</a></li>
			<li><a href="https://www.telerik.com/fiddler" target="_blank">Fiddler</a></li>
			<li><a href="https://github.com/typicode/json-server" target="_blank">JSON Server</a></li>
			<li><a href="https://swagger.io" target="_blank">Swagger</a></li>
			<li><a href="https://mockoon.com" target="_blank">Mockoon</a></li>
			<li><a href="https://github.com/dhuan/mock" target="_blank">Mock</a></li>
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
			<li><a href="https://mswjs.io" target="_blank">MSW</a></li>
			<li><a href="https://github.com/nock/nock" target="_blank">Nock</a></li>
			<li><a href="https://github.com/wheresrhys/fetch-mock" target="_blank">Fetch Mock</a></li>
			<li><a href="https://github.com/humanwhocodes/mentoss" target="_blank">Mentoss</a></li>
			<li><a href="https://github.com/miragejs/miragejs" target="_blank">MirageJS</a></li>
		</ul>
	`
})
