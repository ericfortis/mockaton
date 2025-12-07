const { htmlTemplate } = await import(`./_htmlTemplate.js?${Date.now()}`)
const { shell, json, js } = await import(`./_syntaxHighlight.js?${Date.now()}`)

// language=html
export default () => htmlTemplate({
	head: `<title>Installation</title>`,
	body: `
		<h1>Installation</h1>


		<br />

		<p>Create a sample mock in the default directory (<code>./mockaton-mocks</code>)</p>
		${shell`
mkdir -p         mockaton-mocks/api
echo "[1,2,3]" > mockaton-mocks/api/foo.GET.200.json
`}


		<h2>Option 1: CLI</h2>

		<p>
			<em>Requires Node.js <strong>v22.18+</strong>.
			Node includes <code>npx</code>, which installs and runs Mockaton.
			</em>
		</p>

		${shell`
npx mockaton --port 4040
`}

		<p>Test it</p>
		${shell`
curl localhost:4040/api/foo
`}


		<h2 id="quick-start-docker-">Option 2: Docker</h2>
		<p>
			This will spin up Mockaton with the sample directories included in
			the repository mounted on the container.
		</p>

		${shell`
git clone https://github.com/ericfortis/mockaton.git --depth 1
cd mockaton
make docker
`}

		<p>Test it:</p>
		${shell`
curl localhost:2020/api/user
`}


		<h2 id="or-on-node-projects">Option 3: For Node Projects</h2>
		${shell`
npm install mockaton --save-dev
`}

		<p>In your <code>package.json</code>:</p>
		${json`
"scripts": {
  "mockaton": "mockaton --port 4040"
}
`}

		<h2>Option 4: Programmatic Launch</h2>

		${js`
import { Mockaton } from 'mockaton'
import config from './mockaton.config.js'

const server = await Mockaton(config)
`}
	`
})
