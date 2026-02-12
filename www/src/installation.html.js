import { htmlTemplate } from './htmlTemplate.js'
import { js, shell, json } from './_syntaxHighlight.js'

// language=html
export default () => htmlTemplate({
	head: `<title>Installation</title>`,
	body: `
		<h1>Installation</h1>
		<p>
			<em>Requires Node.js <strong>v22.18+</strong></em>
		</p>
		<br />

		<p>Create a sample mock in the default directory (<code>./mockaton-mocks</code>)</p>
		${shell`
mkdir -p         mockaton-mocks/api
echo "[1,2,3]" > mockaton-mocks/api/foo.GET.200.json
`}

		<h2>Option 1: CLI</h2>
		${shell`npx mockaton --port 4040`}

		<p>Test it:</p>
		${shell`curl localhost:4040/api/foo`}



		<h2>Option 2: NPM</h2>
		${shell`npm install mockaton --save-dev`}

		<p>In your <code>package.json</code>:</p>
		${json`
"scripts": {
  "mockaton": "mockaton --port 4040"
}
`}



		<h2>Option 3: Programmatic Launch</h2>
		${js`
import { Mockaton } from 'mockaton'
import config from './mockaton.config.js'

const server = await Mockaton(config)
`}


		<h2>Option 4: Docker</h2>
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
			<a href="https://github.com/ericfortis/mockaton/blob/main/Dockerfile" target="_blank">Dockerfile</a>,
			<a href="https://github.com/ericfortis/mockaton/blob/main/Makefile" target="_blank">Makefile</a>
		</p>
	`
})
