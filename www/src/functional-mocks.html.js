const { htmlTemplate } = await import(`./_htmlTemplate.js?${Date.now()}`)
const { js } = await import(`./_syntaxHighlight.js?${Date.now()}`)

// language=html
export default () => htmlTemplate({
	head: `<title>Functional Mocks</title>`,
	body: `
		<h1>Functional Mocks</h1>

		<p>
			You can write JSON mocks in JavaScript or TypeScript
		</p>
		<p><em>
			Node 22.18+ or 23.6+ support TypeScript by default.
		</em></p>


		<h2 id="option-a-an-object-array-or-string-is-sent-as-json">
			Option A: An Object, Array, or String is sent as JSON
		</h2>

		<p><code>api/foo.GET.200.js</code></p>
		${js`
export default { foo: 'bar' }
`}


		<h2 id="option-b-function-mocks-async-or-sync-">
			Option B: Function Mocks
		</h2>
		<p>
			Return a <code>string | Buffer | Uint8Array</code>,
			but <strong>don’t call</strong> <code>response.end()</code>.
		</p>

		${js`
export default (request, response) =>
  JSON.stringify({ foo: 'bar' })
`}
		<p>
			<code>async</code> functions are supported.
		</p>

		<h3 id="custom-http-handlers">
			Custom HTTP Handlers
		</h3>
		<p>
			For example, you can intercept requests to write to a database. Or act based on
			some query string value, etc. In summary, you get Node’s <code>request</code>,
			<code>response</code> as arguments, so you can think of Mockaton as a
			router, but in the handlers you return, instead of ending the response.
		</p>

		<h4>Examples</h4>

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

		<h4>
			What if I need to serve a static .js or .ts?
		</h4>
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
