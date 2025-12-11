const { htmlTemplate } = await import(`./_htmlTemplate.js?${Date.now()}`)
const { js } = await import(`./_syntaxHighlight.js?${Date.now()}`)

// language=html
export default () => htmlTemplate({
	head: `<title>Plugins</title>`,
	body: `
		<h1>Plugins</h1>
		
		<p>
			Plugins are for processing mocks before sending them. If no
			regex matches the filename, the fallback plugin will read
			the file from disk and compute the MIME from the extension.
		</p>
		<p>Note: don’t call <code>response.end()</code> on any plugin.</p>

		${js`
type Plugin = (
  filePath: string,
  request: IncomingMessage,
  response: OutgoingMessage
) => Promise<{
  mime: string,
  body: string | Uint8Array
}>
`}


		<h2>Examples</h2>

		${js`
import { parse } from 'yaml' // npm install yaml
import { readFileSync } from 'node:js'
import { jsToJsonPlugin } from 'mockaton'

config.plugins = [
  // Although \`jsToJsonPlugin\` is set by default, you need to include it if you need it.
  // IOW, your plugins array overwrites the default list. This way you can remove it.
  [/\\.(js|ts)$/, jsToJsonPlugin],

  [/\\.yml$/, yamlToJsonPlugin],

  // e.g. GET /api/foo would be capitalized
  [/foo\\.GET\\.200\\.txt$/, capitalizePlugin]
]


function yamlToJsonPlugin(filePath) {
  return {
    mime: 'application/json',
    body: JSON.stringify(parse(readFileSync(filePath, 'utf8')))
  }
}

function capitalizePlugin(filePath) {
  return {
    mime: 'application/text',
    body: readFileSync(filePath, 'utf8').toUpperCase()
  }
}
`}
	`
})
