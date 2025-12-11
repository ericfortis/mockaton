// TODO rename .Server (more unique)
// TODO https://www.rfc-editor.org/rfc/rfc9457.html

import { join } from 'node:path'
import { readFileSync } from 'node:fs'


const { htmlTemplate } = await import(`./_htmlTemplate.js?${Date.now()}`)
const { js, json } = await import(`./_syntaxHighlight.js?${Date.now()}`)
const OpenAPI = JSON.parse(readFileSync(join(import.meta.dirname, './static/openapi.json'), 'utf8'))
// Not importing so it's not cached on hot-reload

const SERVER = OpenAPI.servers[0].url

// language=html
export default () => htmlTemplate({
	head: `
		<link rel="stylesheet" href="api.css" />
		<title>Control API</title>
	`,
	body: `
		<h1>
			Control API
			<a href="static/openapi.json" target="_blank">OpenAPI Spec ↗</a>
		</h1>

		<form>
			<label>
				<span>Server</span>
				<input id="ServerInput" type="url" value="${SERVER}">
			</label>
		</form>

		${js(`
import { Commander } from 'mockaton'
const mockaton = new Commander('${SERVER}')
`).replace(SERVER, `<span class="Server">${SERVER}</span>`)}

		<section class="Apis">${AllApis()}</section>
		<script src="api.js"></script>
	`
})

function AllApis() {
	return Object.entries(OpenAPI.paths).map(([url, methods]) =>
		Object.entries(methods).map(([method, obj]) => Api(method, url, obj)))
		.join('\n')
}

function Api(method, url, obj) {
	const urlParts = url.split('/')
	const urlLast = urlParts.pop()
	return `
		<details>
			<summary>
				<span class="Method">${method}</span>
				<span class="Path">${urlParts.join('/')}<strong>/${urlLast}</strong></span>
				<span class="Summary">${obj?.summary}</span>
			</summary>
			<div>
				${obj.description ? `<p>${backticksToCode(obj.description)}</p>` : ''}
				${js([obj?.['x-js-client-example']])}
				<div class="CurlWrap">
					<pre><code class="Curl">${Curl(method, url, obj.requestBody)}</code></pre>
					<button class="CopyButton" title="Copy">${CopyIcon()}</button>
				</div>
			</div>
		</details>
		`
}

function Curl(method, url, requestBody) {
	return [
		`<span class="syntax_function">curl</span> <span class="Server">${SERVER}</span>${url}`,
		method !== 'get' && `  --request ${method.toUpperCase()}`,
		requestBody && dataForReqBody(requestBody)
	].filter(Boolean).join(' \\\n')
}


function dataForReqBody({ content }) {
	const { schema } = content?.['application/json']
	return schema
		? `  --data '${json(JSON.stringify(exampleFor(schema)), false)}'`
		: ''

	function exampleFor(schema) {
		const s = resolve(schema)
		if (s.example) return s.example
		if (s.type === 'string') return ''
		if (s.type === 'integer') return 0
		if (s.type === 'number') return 0
		if (s.type === 'boolean') return false
		if (s.type === 'array') return Array.isArray(s.prefixItems)
			? s.prefixItems.map(exampleFor)
			: []
		if (s.type === 'object' && s.properties) {
			const obj = {}
			for (const [key, prop] of Object.entries(s.properties))
				obj[key] = exampleFor(prop)
			return obj
		}
		return null
	}

	function resolve(schema) {
		return schema.$ref
			? resolve(resolveRef(schema.$ref))
			: schema
	}

	function resolveRef(ref) {
		const path = ref.slice(2).split('/') // removes "#/" prefix
		let node = OpenAPI
		for (const p of path)
			node = node[p]
		return node
	}
}


function backticksToCode(str) {
	return str.replace(/`([^`]+)`/g, '<code>$1</code>')
}

function CopyIcon() {
	return `
	<svg width="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2m0 16H8V7h11z" />
	</svg>`
}
