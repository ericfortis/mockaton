const { htmlTemplate } = await import(`./_htmlTemplate.js?${Date.now()}`)

// language=html
export default () => htmlTemplate({
	head: `<title>Motivation</title>`,
	body: `
		<h1 id="motivation-">
			Motivation
		</h1>
		<p>
			Sometimes the flow you need is too difficult to reproduce from the actual backend.
		</p>

		<h2 id="deterministic-and-comprehensive-states">
			Deterministic and Comprehensive States
		</h2>
		<ul>
			<li>Demo edge cases to PMs, Design, and Clients</li>
			<li>
				Trigger state transitions on an API. For
				example, from empty or from error, to ok.
			</li>
			<li>
				Set up screenshot tests (see <a
				href="https://github.com/ericfortis/mockaton/tree/main/pixaton-tests"
				target="_blank">pixaton-tests/</a> in the repo)
			</li>
			<li>
				Spot inadvertent regressions by developing against
				all possible permutations. See the color cards below.
			</li>
		</ul>

		<div class="RegionImg" data-max-width="740">
			<img src="assets/media/demo-app.png" alt="Mockaton Demo App Screenshot" />
		</div>


		<h2 id="testing-scenarios-that-would-otherwise-be-skipped">
			Testing Scenarios that Would Otherwise be Skipped
		</h2>
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
