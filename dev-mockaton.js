import { join } from 'node:path'
import { Mockaton, jwtCookie } from './index.js'


export const devConfig = {
	port: 2345,
	mocksDir: join(import.meta.dirname, 'fixtures-mocks'),
	staticDir: join(import.meta.dirname, 'fixtures-static-mocks'),
	cookies: {
		'My Admin User': 'my-cookie=1;Path=/;SameSite=strict',
		'My Normal User': 'my-cookie=0;Path=/;SameSite=strict',
		'My JWT': jwtCookie('my-cookie', {
			email: 'john.doe@example.com',
			picture: 'https://cdn.auth0.com/avatars/jd.png'
		})
	}
}

// If this file was called as `node dev-mockaton.js` (not imported for tests)
if (import.meta.url === `file://${process.argv[1]}`)
	Mockaton(devConfig)
	
