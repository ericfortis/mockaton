import { htmlTemplate, socialMetadata } from './_htmlTemplate.js'
import { js } from './_syntaxHighlight.js'

// language=html
export default (url) => htmlTemplate({
	head: socialMetadata('Privacy and Security', '', url),
	body: `
		<h1>About</h1>

		<p>
			I‘m <a href="https://ericfortis.com/">Eric Fortis</a>, a frontend developer.
			I designed, develop, and maintain Mockaton. Before Mockaton, I used
			a tiny Node.js handler to dispatch mocks. Something like:
		</p>

		${js(`
import { createServer } from 'node:http'
		
const getApis = {
  '/api/user': './user.json',
  '/api/company': './company.json',
}		

createServer((req, response) => {
  swich (req.method) {
		case 'GET': {
			const file = getApis[req.url]
			if (file)
				response.end(readFileSync(file)
			break;
		}
  }
}).listen(2020)
`)}
		
		<p>
			And before that, I used different setups, some with Nginx, others with
			Charles Proxy, and others with Burp.
		</p>
		
		<p>
			For the most part, all of them worked well, except for 
			when I needed to test state changes and edge cases. 
			Mainly because I had to manually change the server code, 
			or to manipulate responses with Burp.
		</p>
		
		<p>
			Although that was a bit inconvenient, I kept using those tools
			for many years. The main problem was around demoing complex
			flows. For instance, changing the code not only wasted important
			time on a presentation, but it also made it more confusing.
			That's why Mockaton allows for comments in filenames, so I can
			quickly change mocks (see the Bulk Select feature). 
		</p>
	` })
