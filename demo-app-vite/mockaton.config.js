import { defineConfig, jwtCookie } from 'mockaton'


export default defineConfig({
	port: 4040,
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
})
