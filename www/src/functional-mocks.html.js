import { htmlTemplate } from './htmlTemplate.js'
import { js } from './_syntaxHighlight.js'

// language=html
export default () => htmlTemplate({
	head: `<title>Functional Mocks</title>`,
	body: `
		<h1>Functional Mocks</h1>

		<p><em>
			Node 22.18+ and 23.6+ support TypeScript by default.
		</em></p>


		<h2>
			You can write mocks in JavaScript or TypeScript
		</h2>

		<p><code>api/foo.GET.200.js</code></p>
		${js`
export default (req, response) => {
  // These two lines are not needed but you can change their values
  /* response.statusCode = 200 */  // default derived from filename
  /* response.setHeader('Content-Type', 'application/json') */ // unconditional default
  return JSON.stringify({ foo: 'bar' })
}
`}
		<p>
			Return a <code>string | Buffer | Uint8Array</code>,
			but <strong>don’t call</strong> <code>response.end()</code>.
			<code>async</code> functions are supported.
		</p>

		<h2 id="custom-http-handlers">
			Custom HTTP Handlers
		</h2>
		<p>
			For example, you can intercept requests to write to a database. Or act based on
			some query string value, etc. In summary, you get Node’s <code>request</code>,
			<code>response</code> as arguments, so you can think of Mockaton as a
			router, but in the handlers you return, instead of ending the response.
		</p>

		<h3>Example A: JSON body parser and in-memory database</h3>

		<p>
			Imagine you have an initial list of colors, and
			you want to concatenate newly added colors.
		</p>

		<code>api/colors.POST.201.js</code>

		${js`
import { parseJSON } from 'mockaton'

export default async function insertColor(req, response) {
  const color = await parseJSON(req)
  globalThis.newColorsDatabase ??= []
  globalThis.newColorsDatabase.push(color)
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

		<h3>Example B: Parse query string params</h3>

		<code>api/list?limit=[my-limit].GET.200.js</code>

		${js`
import { parseQueryParams } from 'mockaton'

export default function (req) {
  const searchParams = parseQueryParams(req.url)
  const limit = Number(searchParams.get('limit'))
  return JSON.stringify({ limit })
}
`}


		<h3>Example C: Parse splats</h3>

		<code>api/company/[companyId]/user/[userId].GET.200.js</code>

		${js`
import { parseSplats } from 'mockaton'

export default function (req, response) {
  const { companyId, userId } = parseSplats(req.url, import.meta.filename)
  return JSON.stringify({ companyId, userId })
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
