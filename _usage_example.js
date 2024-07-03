#!/usr/bin/env node

import { resolve } from 'node:path'
import { Mockaton, jwtCookie } from './index.js' // from 'mockaton'

Mockaton({
	port: 2345,
	mocksDir: resolve('sample-mocks'),
	staticDir: resolve('sample-static'),
	cookies: {
		'Admin User': 'my-cookie=1;Path=/;SameSite=strict',
		'Normal User': 'my-cookie=0;Path=/;SameSite=strict',
		'My JWT': jwtCookie('my-cookie', {
			email: 'john.doe@example.com',
			picture: 'https://cdn.auth0.com/avatars/jd.png'
		})
	}
})
