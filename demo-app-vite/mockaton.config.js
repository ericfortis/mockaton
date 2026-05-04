import { defineConfig, jwtCookie } from 'mockaton'


export default defineConfig({
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
