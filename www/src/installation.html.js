import { htmlTemplate, socialMetadata } from './_htmlTemplate.js'
import { js, shell, json } from './_syntaxHighlight.js'

// language=html
export default (url) => htmlTemplate({
	head: socialMetadata('Installation', '', url),
	body: `
		<h1>Installation</h1>
		<p>
			<em>Requires Node.js <strong>v22.18+</strong></em>
		</p>

		<h2>Option 1: CLI</h2>
		<p>Create a sample mock in the default directory (<code>./mockaton-mocks</code>)</p>
		${shell`
mkdir -p         my-mocks/api
echo "[1,2,3]" > my-mocks/api/foo.GET.200.json
`}
		${shell`npx mockaton --port 4040 my-mocks`}

		<p>Test it:</p>
		${shell`curl localhost:4040/api/foo`}


		<h2>Option 2: Vite Plugin</h2>

		${shell`
npm install mockaton --save-dev
`}

		${js`
import { defineConfig } from 'vite'
import mockatonPlugin from 'mockaton/vite'

export default defineConfig({
	plugins: [
		// …other plugins
		mockatonPlugin({
			port: 4040,
			mocksDir: './my-mocks',
		})
	]
})
		`}


		<h2>Option 3: NPM</h2>
		${shell`npm install mockaton --save-dev`}

		<p>In your <code>package.json</code>:</p>
		${json`
"scripts": {
  "mockaton": "mockaton --port 4040 my-mocks"
}
`}


		<h2>Option 4: Programmatic Launch</h2>
		<p>
			<code>mockaton.config.json</code> is not read by default in this case,
			so if you want to use it you’d have to import it.
		</p>
		${js`
import { Mockaton } from 'mockaton'
import config from './mockaton.config.js' // optional

const server = await Mockaton(config)
`}


		<h2>Option 5: Docker</h2>
		<p>
			This will spin up Mockaton with the sample directories
			included in the repository mounted on the container.
		</p>

		${shell`
git clone https://github.com/ericfortis/mockaton.git --depth 1
cd mockaton
make docker
`}

		<p>
			<a href="https://github.com/ericfortis/mockaton/blob/main/Dockerfile">Dockerfile</a>,
			<a href="https://github.com/ericfortis/mockaton/blob/main/Makefile">Makefile</a>
		</p>
	`
})
