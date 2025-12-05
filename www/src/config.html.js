const { htmlTemplate } = await import(`./_htmlTemplate.js?${Date.now()}`)
const { js, shell, raw } = await import(`./_syntaxHighlight.js?${Date.now()}`)

// language=html
export default () => htmlTemplate({
	head: `<title>Config</title>`,
	body: `
		<h1>Config</h1>


		<h2 id="cli-options">CLI Options</h2>
		<p>The CLI options override their counterparts in <code>mockaton.config.js</code></p>

		${shell`
-c, --config <file>    (default: ./mockaton.config.js)

-m, --mocks-dir <dir>  (default: ./mockaton-mocks/)
-s, --static-dir <dir> (default: ./mockaton-static-mocks/)

-H, --host <host>      (default: 127.0.0.1)
-p, --port <port>      (default: 0) which means auto-assigned

-q, --quiet            Errors only
--no-open              Don’t open dashboard in a browser

-h, --help
-v, --version
		`}


		<h2 id="mockaton-config-js-optional-">
			mockaton.config.js (Optional)
		</h2>
		<p>
			Mockaton looks for a file <code>mockaton.config.js</code>
			in its current working directory. The next section has
			the documentation, but here’s an overview of the defaults:
		</p>

		${js`
import { 
  defineConfig, 
  jsToJsonPlugin, 
  openInBrowser, 
  SUPPORTED_METHODS 
} from 'mockaton'

export default defineConfig({
  mocksDir: 'mockaton-mocks',
  staticDir: 'mockaton-static-mocks',
  ignore: /(\\.DS_Store|~)$/,
  watcherEnabled: true,

  host: '127.0.0.1',
  port: 0, // auto-assigned

  logLevel: 'normal',

  delay: 1200, // ms. Applies to routes with the Delay Checkbox "ON"
  delayJitter: 0,

  proxyFallback: '',
  collectProxied: false,
  formatCollectedJSON: true,

  cookies: {},
  extraHeaders: [],
  extraMimes: {},

  corsAllowed: true,
  corsOrigins: ['*'],
  corsMethods: SUPPORTED_METHODS,
  corsHeaders: ['content-type', 'authorization'],
  corsExposedHeaders: [],
  corsCredentials: true,
  corsMaxAge: 0,

  plugins: [
    [/\\.(js|ts)$/, jsToJsonPlugin]
  ],

  onReady: await openInBrowser
})
		`}


		<h2>Config Documentation</h3>

			<h3><code>mocksDir?: string</code></h3>
			<p>
				Defaults to <code>mockaton-mocks</code>.
			</p>

			<h3><code>staticDir?: string</code></h3>
			<p>
				Defaults to <code>mockaton-static-mocks</code>. This option is not needed
				besides serving partial content (e.g., videos). But it’s convenient
				for serving 200 GET requests without having to add the filename
				extension convention. For example, for using Mockaton as a standalone
				demo server, as explained above in the <em>Use Cases</em> section.
			</p>
			<p>
				Files under <code>config.staticDir</code> take precedence over
				corresponding <code>GET</code> mocks in <code>config.mocksDir</code>
				(regardless of status code). For example, if you have two files for
				<code>GET</code> <span class="NullLink">/foo/bar.jpg</span> such as:
			</p>

			${raw(`
my-static-dir<strong>/foo/bar.jpg</strong> <span class="green"> // Wins</span>
 my-mocks-dir<strong>/foo/bar.jpg</strong>.GET.200.jpg <span class="red"> // Unreachable</span>
			`)}


			<h3><code>ignore?: RegExp</code></h3>
			<p>
				Defaults to <code>/(\\.DS_Store|~)$/</code>
			</p>
			<p>
				The regex rule is tested against the basename (filename without a directory path).
			</p>


			<h3><code>watcherEnabled?: boolean</code></h3>
			<p>
				Defaults to <code>true</code>
			</p>
			<p>
				When <code>false</code>, if you <strong>add</strong>, <strong>delete</strong>, or <strong>rename</strong> you’ll need to click <strong>&quot;Reset&quot;</strong>
				on the Dashboard, or call <code>commander.reset()</code> in order to re-initialize the collection.
			</p>
			<p>
				On the other hand, <strong>edits are not affected by this
				flag</strong>; mocks are always read from disk on every request.
			</p>

			<br />


			<h3><code>host?: string</code></h3>
			<p>
				Defaults to <code>127.0.0.1</code>
			</p>

			<h3><code>port?: number</code></h3>
			<p>
				Defaults to <code>0</code>, which means auto-assigned
			</p>

			<br />

			<h3><code>delay?: number</code></h3>
			<p>
				Defaults to <code>1200</code> milliseconds. Although
				routes can individually be delayed with the 🕓 Checkbox,
				the amount is globally configurable with this option.
			</p>

			<h3><code>delayJitter?: number</code></h3>
			<p>
				Defaults to <code>0</code>. Range: <code>[0.0, 3.0]</code>. Maximum
				percentage of the delay to add. For example, <code>0.5</code>
				will add at most <code>600ms</code> to the default delay.
			</p>

			<br />

			<h3><code>proxyFallback?: string</code></h3>
			<p>
				For example, <code>config.proxyFallback = &#39;http://example.com&#39;</code>
			</p>
			<p>
				Lets you specify a target server for serving routes you don’t have mocks for,
				or that you manually picked with the ☁️ <strong>Cloud Checkbox</strong>.
			</p>


			<h3><code>collectProxied?: boolean</code></h3>
			<p>
				Defaults to <code>false</code>. With this flag you can save mocks that hit
				your proxy fallback to <code>config.mocksDir</code>. If the URL has v4 UUIDs,
				the filename will have <code>[id]</code> in their place. For example:
			</p>

			${raw(`
<strong>/api/user/</strong>d14e09c8-d970-4b07-be42-b2f4ee22f0a6<b>/likes</b> =&gt;
  my-mocks-dir<strong>/api/user/</strong>[id]<b>/likes</b>.GET.200.json
`)}

			<p>
				Your existing mocks won’t be overwritten. Responses
				of routes with the ☁️ <strong>Cloud Checkbox</strong>
				selected will be saved with unique filename-comments.
			</p>
			<p>
				An <code>.empty</code> extension means the
				<code>Content-Type</code> header was not sent by your backend.
			</p>
			<p>
				An <code>.unknown</code> extension means the <code>Content-Type</code> is not in
				the predefined list. For that, you can add it to <code>config.extraMimes</code>
			</p>


			<h3 id="-formatcollectedjson-boolean-">
				<code>formatCollectedJSON?: boolean</code>
			</h3>
			<p>
				Defaults to <code>true</code>. Saves the mock with two spaces indentation —
				the formatting output of <code>JSON.stringify(data, null, &#39; &#39;)</code>
			</p>

			<h3 id="-cookies-label-string-string-">
				<code>cookies?: { [label: string]: string }</code>
			</h3>

			${js`
import { jwtCookie } from 'mockaton'

config.cookies = {
  'My Admin User': 'my-cookie=1;Path=/;SameSite=strict',
  'My Normal User': 'my-cookie=0;Path=/;SameSite=strict',
  'My JWT': jwtCookie('my-cookie', {
    name: 'John Doe',
    picture: 'https://cdn.auth0.com/avatars/jd.png'
  }),
  'None': ''
}
`}

			<p>
				The selected cookie, which is the first one by default, is sent in
				every response in a <code>Set-Cookie</code> header (as long as its
				value is not an empty string). The object key is just a label for UI
				display purposes and also for selecting a cookie via the Commander API.
			</p>
			<p>
				If you need to send more than one cookie, you can inject them
				globally in <code>config.extraHeaders</code>, or individually
				in a function <code>.js</code> or <code>.ts</code> mock.
			</p>
			<p>
				By the way, the <code>jwtCookie</code> helper has a hardcoded header
				and signature. So it’s useful only if you care about its payload.
			</p>

			<h3 id="-extraheaders-string-">
				<code>extraHeaders?: string[]</code>
			</h3>
			<p>
				Note: it’s a one-dimensional array. The header name goes at even indices.
			</p>

			${js`
config.extraHeaders = [
  'Server', 'Mockaton',
  'Set-Cookie', 'foo=FOO;Path=/;SameSite=strict',
  'Set-Cookie', 'bar=BAR;Path=/;SameSite=strict'
]
`}


			<h3 id="-extramimes-fileext-string-string-">
				<code>extraMimes?: { [fileExt: string]: string }</code>
			</h3>

			${js`
config.extraMimes = {
  jpe: 'application/jpeg',
  html: 'text/html; charset=utf-8' // overrides built-in
}
`}
			<p>
				Those extra media types take precedence over the built-in <a
				href="src/server/utils/mime.js">utils/mime.js</a>, so you can override them.
			</p>

			<h3 id="-plugins-filenametester-regexp-plugin-plugin-">
				<code>plugins?: [filenameTester: RegExp, plugin: Plugin][]</code>
			</h3>

			<a href="/plugins">See Plugins -></a>


			<h3 id="-corsallowed-boolean-">
				<code>corsAllowed?: boolean</code>
			</h3>
			<p>
				Defaults to <code>true</code>. When <code>true</code>, these are the default options:
			</p>


			${js`
config.corsOrigins = ['*']
config.corsMethods = require('node:http').METHODS
config.corsHeaders = ['content-type', 'authorization']
config.corsCredentials = true
config.corsMaxAge = 0 // seconds to cache the preflight req
config.corsExposedHeaders = [] // headers you need to access in client-side JS			
`}


			<h3 id="-onready-dashboardurl-string-void-">
				<code>onReady?: (dashboardUrl: string) =&gt; void</code>
			</h3>

			<p>
				By default, it will open the dashboard in your default browser on macOS and
				Windows. But for a more cross-platform utility you could 
				<code>npm install open</code> 
				and that implementation will be automatically used instead.
			</p>
			<p>If you don’t want to open a browser, pass a noop:</p>

			${js`
config.onReady = () => {}
`}
			<p>At any rate, you can trigger any command besides opening a browser.</p>

			<h3 id="-loglevel-quiet-normal-verbose-">
				<code>logLevel?: &#39;quiet&#39; | &#39;normal&#39; | &#39;verbose&#39;</code>
			</h3>
			<p>Defaults to <code>&#39;normal&#39;</code>.</p>
			<ul>
				<li><code>quiet</code>: only errors (stderr)</li>
				<li><code>normal</code>: info, mock access, warnings, and errors</li>
				<li><code>verbose</code>: normal + API access</li>
			</ul>
	`
})
