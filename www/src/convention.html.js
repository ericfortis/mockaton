import { METHODS } from 'node:http'

const { htmlTemplate } = await import(`./_htmlTemplate.js?${Date.now()}`)
const { raw } = await import(`./_syntaxHighlight.js?${Date.now()}`)


// language=html
export default () => htmlTemplate({
	head: `<title>Convention</title>`,
	body: `
		<h1>Filename Convention</h1>
		<p>
			The convention is for mocks within your <code class="green">config.mocksDir</code>.
			On the other hand, mocks in your <code class="red">config.staticDir</code> should
			have no custom extension. Those are always <code>GET</code> and return
			<code>200</code> or partial content <code>206</code>.
		</p>

		<h2 id="extension">
			Extension <span class="normalWeight">(three dots)</span>
		</h2>
		<p>
			The last three dots are reserved for the:
		</p>
		<ul>
			<li>HTTP Method</li>
			<li>Response Status Code</li>
			<li>File Extension</li>
		</ul>
		<pre><code>api/user<span class="hljs-selector-class">.GET</span>.<span class="hljs-number">200</span>.json
</code></pre>
		<p>
			You can also use <code>.empty</code> or <code>.unknown</code> if
			you don’t want a <code>Content-Type</code> header in the response.
		</p>
		<details>
			<summary>Supported Methods</summary>
			<p>${METHODS.join(', ')}</p>
		</details>
		

		<h2 id="splats">
			Splats
		</h2>
		<p>
			Anything within square brackets is always matched.
		</p>
		<p>
			For example, for <span class="NullLink">/api/company/<strong>123</strong>/user/<strong>789</strong></span>,
			the filename could be:
		</p>
		<pre><code>api/company/<strong>[id]</strong>/user/<strong>[uid]</strong>.GET.200.json</code></pre>

		
		<h2 id="comments">
			Comments
		</h2>
		<p>
			Comments are anything within parentheses, including them. They
			are ignored for routing purposes, so they have no effect on the
			URL mask. For example, these two are for <code>/api/foo</code>
		</p>
		<pre>
api/foo<strong>(my comment)</strong>.GET.200.json
api/foo.GET.200.json
</pre>

		<p>A filename can have many comments.</p>

		
		<h2 id="default-mock-for-a-route">
			Default Mock for a Route
		</h2>
		<p>
			You can add the comment: <code>(default)</code>.
			Otherwise, the first file in <strong>alphabetical order</strong> wins.
		</p>

		<pre>
api/user<strong>(default)</strong>.GET.200.json
</pre>

		<h2 id="query-string-params">
			Query String Params
		</h2>
		<p>
			The query string is ignored for routing purposes.
			It’s only used for documenting the URL contract.
		</p>
		<pre>
api/video<strong>?limit=[limit]</strong>.GET.200.json
</pre>

		<p>
			On Windows, filenames containing &quot;?&quot; are <a
			href="https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file" target="_blank">not
			permitted</a>, but since that’s part of the query string, it’s ignored anyway.
		</p>

		
		<h2 id="index-like-routes">
			Index-like Routes
		</h2>
		<p>
			If you have <span class="NullLink">api/foo</span> and 
			<span class="NullLink">api/foo/bar</span>, you have two options:
		</p>
		<p><strong>Option A.</strong> Standard naming:</p>

		${raw(`
api/foo.GET.200.json
api/foo/bar.GET.200.json
`)}
		
		<p><strong>Option B.</strong> Omit the URL on the filename:</p>

		${raw(`
api/foo/.GET.200.json
api/foo/bar.GET.200.json
`)}
	`
})
