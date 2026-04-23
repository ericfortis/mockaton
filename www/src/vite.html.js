import { htmlTemplate, socialMetadata } from './_htmlTemplate.js'
import { js, shell } from './_syntaxHighlight.js'

// language=html
export default (url) => htmlTemplate({
	head: socialMetadata('Vite Plugin', 'Vite plugin for Mockaton', url),
	body: `
		<h1>Vite Plugin</h1>

		<p>
			Starts <a href="/">Mockaton</a> along with Vite dev server.
		</p>

		<h2>Installation</h2>

		${shell`npm install vite-plugin-mockaton --save-dev`}

		<h2>Usage</h2>

		<p>In your <code>vite.config.js</code>:</p>

		${js`
import { defineConfig } from 'vite'
import mockaton from 'vite-plugin-mockaton'

export default defineConfig({
  plugins: [
    mockaton({
      // Mockaton options
      port: 4040,
      mocksDir: './mocks'
    })
  ]
})
`}

		<h2>Options</h2>

		<p>
			The plugin accepts any <a href="/config">Mockaton configuration options</a>.
		</p>
	`
})
