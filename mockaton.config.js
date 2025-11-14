import { join } from 'node:path'
import { jwtCookie } from 'mockaton'

// See src/config.js for all the options.
// This file is just developing and testing Mockaton.
// This file is optional everywhere.

export default {
	port: 2020,
	
	mocksDir: join(import.meta.dirname, 'mockaton-mocks'),
	staticDir: join(import.meta.dirname, 'mockaton-static-mocks'),

	cookies: {
		'Admin User': 'my-cookie=1;Path=/;SameSite=strict',
		'Normal User': 'my-cookie=0;Path=/;SameSite=strict',
		'My JWT': jwtCookie('my-cookie', {
			email: 'john.doe@example.com',
			picture: 'https://cdn.auth0.com/avatars/jd.png'
		}),
		'None': ''
	},
	
	logLevel: 'verbose',
	hotReload: true
}
