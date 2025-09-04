import CSS from './Instructions.module.css'


export function Instructions() {
	return (
		<section className={CSS.Instructions}>
			<h2>Mockaton Demo App</h2>

			<p>Here are a couple of things you can play with to get started with the dashboard:</p>
			<ul>
				<li>Pick the <strong>204</strong> (No Content) mock variant and refresh this page</li>
				<li>Click the 🕓 <strong>Delay</strong> response checkbox (expect a Loading… indicator)</li>
				<li>Click the <strong>500</strong> checkbox (expect an error message)</li>
				<li>Select the <strong>Admin User</strong> cookie (expect a delete button on each card)</li>
			</ul>
			<p>
				Finally, edit a mock file in your IDE.
			</p>
		</section>
	)
}
