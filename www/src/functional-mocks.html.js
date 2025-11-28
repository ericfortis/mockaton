const { htmlTemplate } = await import(`./_htmlTemplate.js?${Date.now()}`)
const { js } = await import(`./_syntaxHighlight.js?${Date.now()}`)

// language=html
export default () => htmlTemplate({
	head: `<title>Functional Mocks</title>`,
	body: `
		<h1>Functional Mocks</h1>

		<h2 id="you-can-write-json-mocks-in-javascript-or-typescript">
			You can write JSON mocks in JavaScript or TypeScript
		</h2>
		<p><em>TypeScript needs <strong>Node 22.18+ or 23.6+</strong></em></p>

		<p>For example, <code>api/foo.GET.200.js</code></p>

		
		<h3 id="option-a-an-object-array-or-string-is-sent-as-json">
			Option A: An Object, Array, or String is sent as JSON
		</h3>

		${js`
export default { foo: 'bar' }
`}

		
		<h3 id="option-b-function-mocks-async-or-sync-">
			Option B: Function Mocks (async or sync)
		</h3>
		<p>
			<strong>Return</strong> a <code>string | Buffer | Uint8Array</code>,
			but <strong>don’t call</strong> <code>response.end()</code>
		</p>

		${js`
export default (request, response) =>
  JSON.stringify({ foo: 'bar' })
`}

		<h4 id="about-custom-http-handlers">
			About Custom HTTP Handlers
		</h4>
		<p>
			For example, you can intercept requests to write to a database. Or act based on
			some query string value, etc. In summary, you get Node’s <code>request</code>,
			<code>response</code> as arguments, so you can think of Mockaton as a
			router, but in the handlers you return, instead of ending the response.
		</p>

		<h5>Examples</h5>

		<p>
			Imagine you have an initial list of colors, and
			you want to concatenate newly added colors.
		</p>

		<code>api/colors.POST.201.js</code>

		${js`
import { parseJSON } from 'mockaton'

export default async function insertColor(request, response) {
  const color = await parseJSON(request)
  globalThis.newColorsDatabase ??= []
  globalThis.newColorsDatabase.push(color)

  // These two lines are not needed but you can change their values
  //   response.statusCode = 201 // default derived from filename
  //   response.setHeader('Content-Type', 'application/json') // unconditional default

  return JSON.stringify({ msg: 'CREATED' })
}
`}

		<br />

		<code>api/colors.GET.200.js</code>
		${js`
import colorsFixture from './colors.json' with { type: 'json' }

export default function listColors() {
  return JSON.stringify([
    ...colorsFixture,
    ...(globalThis.newColorsDatabase || [])
  ])
}
`}

		<p>
			<strong>What if I need to serve a static .js or .ts?</strong>
		</p>
		<p>
			<strong>Option A:</strong> Put it in your <code>config.staticDir</code> without the <code>.GET.200.js</code> extension.
			Mocks in <code>staticDir</code> take precedence over <code>mocksDir/*</code>.
		</p>
		<p>
			<strong>Option B:</strong> Read it and return it. For example:
		</p>

		${js`
import { readFileSync } from 'node:fs'

export default function (_, response) {
  response.setHeader('Content-Type', 'application/javascript')
  return readFileSync('./some-dir/foo.js', 'utf8')
}
`}
		</body>
		</html>
	`
})
