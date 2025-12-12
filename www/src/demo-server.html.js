const { htmlTemplate } = await import(`./_htmlTemplate.js?${Date.now()}`)
const { shell } = await import(`./_syntaxHighlight.js?${Date.now()}`)

// language=html
export default () => htmlTemplate({
	head: `<title>Standalone Demo Server</title>`,
	body: `
		<h1>Standalone Demo Server</h1>

		<p>
			You can deploy a Mockaton instance with your built SPA.
			For that, put the built assets in <code>config.staticDir</code>.
		</p>
		<p>
			The repo includes a demo which builds the frontend app and runs 
			a docker container with Mockaton as backend.
		</p>

		${shell`
git clone https://github.com/ericfortis/mockaton.git --depth 1
cd mockaton/demo-app-vite
make run-standalone-demo
`}

		<p>App: <a href="http://localhost:4040">http://localhost:4040</a></p>
		<p>Dashboard: <a href="http://localhost:4040/mockaton">http://localhost:4040/mockaton</a></p>
	`
})
