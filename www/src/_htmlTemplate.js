import pkgJson from '../../package.json' with { type: 'json' }

const pages = [
	['/', 'Overview'],
	['/motivation', 'Motivation'],
	['/installation', 'Installation'],
	['/scraping', 'Scraping Mocks'],
	['/convention', 'Convention'],
	['/function-mocks', 'Function Mocks'],
	['/config', 'Config'],
	['/api', 'API'],
	['/plugins', 'Plugins'],
	['/privacy-and-security', 'Privacy and Security'],
	['/changelog', 'Changelog'],
	['/alternatives', 'Alternatives']
]

export function socialMetadata(title, description, route = '') {
	return `
<title>${title}</title>

<meta property="og:title" content="${title}" />
${description && `<meta property="og:description" content="${description}" />`}
<meta property="og:image" content="https://mockaton.com/assets/social-preview.jpg" />
<meta property="og:url" content="https://mockaton.com${route}" />
<meta property="og:type" content="website" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
${description && `<meta name="twitter:description" content="${description}" />`}
<meta name="twitter:image" content="https://mockaton.com/assets/social-preview.jpg" />
	`
}

// language=html
export const htmlTemplate = ({ head = '', body }) => `
	<!doctype html>
	<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<meta name="description" content="HTTP Mock Server">
		<link rel="stylesheet" href="/_assets/base.css" />
		<link rel="stylesheet" href="/_assets/header.css" />
		<link rel="stylesheet" href="/_assets/nav.css" />
		<link rel="stylesheet" href="/_assets/syntax.css" />
		<link rel="icon" href="data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='m235 33.7v202c0 9.19-5.81 14-17.4 14-11.6 0-17.4-4.83-17.4-14v-151c-0.115-4.49-6.72-5.88-8.46-0.87l-48.3 155c-2.22 7.01-7.72 10.1-16 9.9-3.63-0.191-7.01-1.14-9.66-2.89-2.89-1.72-4.83-4.34-5.57-7.72-11.1-37-22.6-74.3-34.1-111-4.34-14-8.95-31.4-14-48.3-1.82-4.83-8.16-5.32-8.46 1.16v156c0 9.19-5.81 14-17.4 14-11.6 0-17.4-4.83-17.4-14v-207c0-5.74 2.62-13.2 9.39-16.3 7.5-3.14 15-4.05 21.8-3.8 3.14 0 6.03 0.686 8.95 1.46 3.14 0.797 6.03 1.98 8.7 3.63 2.65 1.38 5.32 3.14 7.5 5.57 2.22 2.22 3.87 4.83 5.07 7.72l45.8 157c4.63-15.9 32.4-117 33.3-121 4.12-13.8 7.72-26.5 10.9-38.7 1.16-2.65 2.89-5.32 5.07-7.5 2.15-2.15 4.58-4.12 7.5-5.32 2.65-1.57 5.57-2.89 8.46-3.63 3.14-0.797 9.44-0.988 12.1-0.988 11.6 1.07 29.4 9.14 29.4 27z' fill='%23808080'/%3E%3C/svg%3E">
		${head}
		<script type="application/ld+json">
			{
				"@context": "https://schema.org",
				"@type": "SoftwareApplication",
				"name": "Mockaton",
				"url": "https://mockaton.com",
				"applicationCategory": "DeveloperApplication",
				"license": "https://opensource.org/licenses/MIT",
				"codeRepository": "https://github.com/ericfortis/mockaton"
			}
		</script>
	</head>
	<body>

	<header>
		<a class="Logo" tabindex="0" href="/" title="Website">
			${MockatonLogo()}
		</a>
		<div class="right">
			<span class="Version">v${pkgJson.version}</span>
			<a class="Github" href="https://github.com/ericfortis/mockaton" aria-label="Mockaton’s Github Repository">
				${GithubIcon()}
			</a>
			<button class="Hamburger">
				${HamburgerIcon()}
			</button>
		</div>
	</header>

	<nav>
		<ul>
			${pages.map(([url, title]) =>
				`<li><a href="${url}">${title}</a></li>`).join('\n')}
		</ul>
	</nav>

	<main>
		<article>${body}</article>
	</main>

	<footer>&copy; 2026 Eric Fortis</footer>

	<script src="/_assets/base.js"></script>
	<script src="/_assets/nav.js"></script>
	<script src="/_assets/speculation.js"></script>

	</body>
	</html>
`


export function MockatonLogo() {
	return `
	<svg viewBox="0 0 460 80" xmlns="http://www.w3.org/2000/svg">
 <path d="m332 29v34.9q0 2.5 1.06 3.84t4.51 1.34h2.5q3.74 0 3.55 4.42 0 4.51-3.55 4.51h-3.17q-3.07 0-5.76-0.768-2.69-0.864-5.18-2.4v0.096q-4.7-3.07-4.7-10.9v-35h-3.74q-3.46 0-3.65-4.51 0-4.51 3.65-4.51h3.74v-10.3q0-4.61 5.47-4.61 5.28 0 5.28 4.61v10.3h7.97q3.74 0 3.55 4.51 0 4.51-3.55 4.51zm50.9-9.02q2.5 0 5.09 1.06 2.69 1.06 5.18 2.69h-0.096q2.5 1.82 3.84 4.8 1.34 2.88 1.34 6.72v27.3q0 7.87-5.18 11.6-5.09 3.65-10.2 3.65h-15.4q-2.5 0-5.09-0.864t-5.09-2.78q-5.18-3.65-5.18-11.6v-27.3q0-3.84 1.34-6.72 1.34-2.98 3.84-4.8h-0.096q2.4-1.63 5.09-2.69t5.18-1.06zm-1.73 48.8q3.55 0 4.99-2.02 1.54-2.02 1.54-4.32v-27.1q0-2.4-1.54-4.32-1.44-2.02-4.99-2.02h-11.9q-3.55 0-5.09 2.02-1.44 1.92-1.44 4.32v27.1q0 2.3 1.44 4.32 1.54 2.02 5.09 2.02zm40 4.99q0 4.61-5.28 4.61t-5.28-4.61v-38.6q0-3.94 1.25-6.82t3.94-4.7q5.09-3.65 10.2-3.65h15.5q4.9 0 10.2 3.65 5.18 3.65 5.18 11.5v38.6q0 4.61-5.28 4.61t-5.28-4.61v-37.7q0-2.5-1.54-4.8l0.096 0.096q-1.25-2.3-5.09-2.3h-12q-3.94 0-5.18 2.3-1.34 2.02-1.34 4.7z"/>
 <path fill="currentColor" d="m282 11-21 64.5v-0.096q-0.576 1.44-1.63 2.4-0.96 0.864-2.4 0.864-0.768 0-1.54-0.192-0.672-0.096-1.44-0.288h0.096q-5.47-1.73-4.03-6.14l21.9-66.5q0.48-1.54 1.63-2.59 1.25-1.06 2.88-1.25 1.63-0.288 3.17-0.384 1.54-0.192 2.4-0.192t2.4 0.192q1.54 0.096 3.17 0.288 1.34 0.192 2.59 1.44 1.34 1.25 2.02 2.5 5.38 16.5 10.8 33.3 5.57 16.7 10.9 33.2 1.34 4.42-4.03 6.14-0.768 0.192-1.44 0.288-0.576 0.192-1.34 0.192-1.34 0-2.5-0.864-1.06-0.96-1.54-2.4v0.096zm7.2 43.8q0 3.07-2.21 5.28-2.11 2.11-5.18 2.11t-5.18-2.11q-2.11-2.21-2.11-5.28t2.11-5.18q2.11-2.21 5.18-2.21t5.18 2.21q2.21 2.11 2.21 5.18z"/>
 <path d="m31.4 36q0-1.25-0.384-2.4-0.384-1.25-0.96-2.3-1.25-2.3-5.18-2.3h-6.14q-3.94 0-5.28 2.3-1.15 2.21-1.15 4.7v38q0 4.51-5.28 4.51-5.47 0-5.47-4.51v-38.9q0-7.87 5.18-11.5 5.28-3.65 10.3-3.65h9.7q2.21 0 4.9 0.864t5.18 2.69q2.4-1.82 4.99-2.69 2.69-0.864 5.09-0.864h9.6q5.09 0 10.2 3.65 5.28 3.55 5.28 11.5v38.9q0 4.51-5.38 4.51t-5.38-4.51v-38q0-1.25-0.288-2.5t-1.06-2.3l0.096 0.096q-0.768-1.25-1.92-1.73-1.15-0.576-3.36-0.576h-6.05q-4.03 0-5.28 2.3-1.25 2.11-1.25 4.7v38q0 4.51-5.28 4.51-5.38 0-5.38-4.51zm83.2-16q2.5 0 5.09 1.06 2.69 1.06 5.18 2.69h-0.096q2.5 1.82 3.84 4.8 1.34 2.88 1.34 6.72v27.3q0 7.87-5.18 11.6-5.09 3.65-10.2 3.65h-15.4q-2.5 0-5.09-0.864t-5.09-2.78q-5.18-3.65-5.18-11.6v-27.3q0-3.84 1.34-6.72 1.34-2.98 3.84-4.8h-0.096q2.4-1.63 5.09-2.69t5.18-1.06zm-1.73 48.8q3.55 0 4.99-2.02 1.54-2.02 1.54-4.32v-27.1q0-2.4-1.54-4.32-1.44-2.02-4.99-2.02h-11.9q-3.55 0-5.09 2.02-1.44 1.92-1.44 4.32v27.1q0 2.3 1.44 4.32 1.54 2.02 5.09 2.02zm75.6-6.24q0 7.87-5.18 11.6-5.09 3.65-10.2 3.65h-16.1q-5.09 0-9.89-3.65-2.3-1.92-3.55-4.8-1.25-2.98-1.25-6.82v-27.4q0-7.78 4.8-11.5 2.4-1.73 4.9-2.69 2.59-1.06 4.99-1.06h16.1q2.3 0 5.09 0.96 2.78 0.864 5.18 2.4 2.3 1.63 3.65 4.51 1.44 2.88 1.44 6.82v4.8q0 4.61-5.28 4.61t-5.28-4.61v-4.13q0-2.4-1.54-4.32-1.44-2.02-4.99-2.02h-12q-3.55 0-5.09 2.02-1.44 1.92-1.44 4.32v27.2q0 2.3 1.44 4.32 1.54 2.02 5.09 2.02h12q3.55 0 4.99-2.02 1.54-2.02 1.54-4.32v-4.42q0-4.51 5.28-4.51t5.28 4.51zm22.8-0.768v12.2q0 4.51-5.28 4.51t-5.28-4.51v-68.4q0-4.61 5.28-4.61t5.28 4.61v40.7q2.4-2.88 5.28-6.14 2.98-3.36 5.86-6.72 2.98-3.46 5.86-6.72 2.88-3.36 5.38-6.24v0.096q1.73-2.02 3.46-2.02 0.96 0 1.82 0.48 0.96 0.384 2.02 1.15h-0.096q2.3 1.92 2.3 3.84 0 0.672-0.288 1.54-0.288 0.768-0.96 1.34zm32.1 9.6q0.672 1.25 0.672 2.59 0 2.5-2.88 3.74-1.92 1.15-3.46 1.15-1.06 0-2.02-0.768-0.96-0.672-1.54-1.73l-9.6-18.5q-0.864-1.44-0.864-2.88 0-2.4 2.5-4.03 0.672-0.48 1.34-0.864 0.768-0.384 1.63-0.576 1.06-0.192 2.02 0.384t1.63 1.54z"/>
</svg>`
}

function GithubIcon() {
	return `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
	<path d="M12 1.27a11 11 0 00-3.48 21.46c.55.09.73-.28.73-.55v-1.84c-3.03.64-3.67-1.46-3.67-1.46-.55-1.29-1.28-1.65-1.28-1.65-.92-.65.1-.65.1-.65 1.1 0 1.73 1.1 1.73 1.1.92 1.65 2.57 1.2 3.21.92a2 2 0 01.64-1.47c-2.47-.27-5.04-1.19-5.04-5.5 0-1.1.46-2.1 1.2-2.84a3.76 3.76 0 010-2.93s.91-.28 3.11 1.1c1.8-.49 3.7-.49 5.5 0 2.1-1.38 3.02-1.1 3.02-1.1a3.76 3.76 0 010 2.93c.83.74 1.2 1.74 1.2 2.94 0 4.21-2.57 5.13-5.04 5.4.45.37.82.92.82 2.02v3.03c0 .27.1.64.73.55A11 11 0 0012 1.27"/>
</svg>
`
}

function HamburgerIcon() {
	return `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
	<path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
</svg>
`
}
