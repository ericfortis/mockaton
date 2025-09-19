import { jwtCookie, defineConfig } from './index.js'

// See src/config.js for all the options
// This file is just developing and testing Mockaton
export default defineConfig({
	port: 2345,

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
})
