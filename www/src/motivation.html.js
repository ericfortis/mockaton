const { htmlTemplate } = await import(`./_htmlTemplate.js?${Date.now()}`)
const { shell } = await import(`./_syntaxHighlight.js?${Date.now()}`)

// language=html
export default () => htmlTemplate({
	head: `<title>Motivation</title>`,
	body: `
		<h1 id="motivation-">
			Motivation
		</h1>

		<h2 id="deterministic-and-comprehensive-states">
			Deterministic and Comprehensive States
		</h2>
		<p>
			Sometimes the flow you need to test is too
			difficult to reproduce from the actual backend.
		</p>
		<ul>
			<li>Demo edge cases to PMs, Design, and clients</li>
			<li>Set up screenshot tests (see <a href="https://github.com/ericfortis/mockaton/tree/main/pixaton-tests" target="_blank">pixaton-tests/</a> in the repo)</li>
			<li>
				Spot inadvertent regressions during development. For example, the
				demo app in this repo has a list of colors containing all of their
				possible states. This way you’ll indirectly notice if something broke.
			</li>
		</ul>

		<div class="RegionImg">
			<img src="static/media/demo-app.png" alt="Mockaton Demo App Screenshot" />
		</div>


		<h2 id="benefits">
			Benefits
		</h2>

		<h3 id="standalone-demo-server-docker-">
			Standalone Demo Server (Docker)
		</h3>
		<p>
			You can demo your app by compiling the frontend and putting
			its built assets in <code>config.staticDir</code>. For example, this
			repo includes a demo which builds and runs a docker container.
		</p>

		${shell`
git clone https://github.com/ericfortis/mockaton.git --depth 1
cd mockaton/demo-app-vite
make run-standalone-demo
`}

		<ul>
			<li>App: <a href="http://localhost:4040">http://localhost:4040</a></li>
			<li>Dashboard: <a href="http://localhost:4040/mockaton">http://localhost:4040/mockaton</a></li>
		</ul>

		<h3 id="testing-scenarios-that-would-otherwise-be-skipped">
			Testing Scenarios that Would Otherwise be Skipped
		</h3>
		<ul>
			<li>Trigger dynamic states on an API. For example, for polled alerts or notifications.</li>
			<li>Testing retries, you can change an endpoint from a 500 to a 200 on the fly.</li>
			<li>Simulate errors on third-party APIs, or on your project’s backend.</li>
			<li>Generate dynamic responses. Use Node’s HTTP handlers (see function mocks below). So you can, e.g.:
				<ul>
					<li>have an in-memory database</li>
					<li>read from disk</li>
					<li>read query string</li>
					<li>pretty much anything you can do with a normal backend request handler</li>
				</ul>
			</li>
		</ul>

		<h3 id="privacy-and-security">
			Privacy and Security
		</h3>
		<ul>
			<li>Does not write to disk. Except when you select ✅ <strong>Save Mocks</strong> for scraping mocks from a backend</li>
			<li>Does not initiate network connections (no logs, no telemetry)</li>
			<li>Does not hijack your HTTP client</li>
			<li>Auditable
				<ul>
					<li>Organized and small. 4 KLoC (half is UI and tests)</li>
					<li>Zero dependencies. No runtime and no build packages.</li>
				</ul>
			</li>
		</ul>

		<h2 id="benefits-of-mocking-apis-in-general">
			Benefits of Mocking APIs in General
		</h2>
		<p>
			The section above highlights benefits specific to Mockaton. There are more, but
			in general here are some benefits that Mockaton has but other tools have as well:
		</p>

		<h3 id="works-around-unstable-dev-backends-while-developing-uis">
			Works Around Unstable Dev Backends while Developing UIs
		</h3>
		<ul>
			<li>Syncing the database and spinning up dev infrastructure can be complex</li>
			<li>Mitigates progress from being blocked by waiting for APIs</li>
		</ul>

		<h3 id="time-travel">
			Time Travel
		</h3>
		<p>
			If you commit the mocks to your repo, you don’t have to downgrade
			backends when checking out long-lived branches or bisecting bugs.
		</p>
	`
})
