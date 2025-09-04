import { join } from 'node:path'
import { jwtCookie } from 'mockaton'


export default {
	mocksDir: join(import.meta.dirname, './mocks'),
	cookies: {
		'Non-Admin User': jwtCookie('id_token', {
			name: 'John Doe',
			roles: ['USER']
		}),
		'Admin User': jwtCookie('id_token', {
			name: 'Charlie Root',
			roles: ['ADMIN']
		})
	}
}
