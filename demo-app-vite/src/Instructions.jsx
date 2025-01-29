import CSS from './Instructions.module.css'


export function Instructions() {
	return (
		<section className={CSS.Instructions}>
			<h2>Mockaton Demo App</h2>

			<p>To get started on the Mockaton dashboard:</p>

			<ul>
				<li>Pick the <strong>(empty)</strong> mock variant from the mock dropdown and refresh this page.</li>
				<li>Click the 🕓 <strong>Delay</strong> response checkbox (refresh and expect a Loading… indicator)</li>
				<li>Click the <strong>500</strong> checkbox (expect an error message)</li>
				<li>On the header, select the <strong>Admin User</strong> cookie (expect a delete button on the color cards)</li>
			</ul>
			<p>
				Finally, edit a mock file in your IDE.
			</p>
		</section>
	)
}
