import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mockatonPlugin from 'mockaton/vite'
import { jwtCookie } from 'mockaton'


const MOCKATON_PORT = 4040

export default defineConfig({
	plugins: [
		react(),
		mockatonPlugin({
			port: MOCKATON_PORT,
			mocksDir: './mockaton-mocks',

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
	],

	server: {
		port: 3030,
		open: false,
		host: true,
		proxy: {
			'/api': {
				target: `http://localhost:${MOCKATON_PORT}`,
				changeOrigin: true
			}
		}
	},

	preview: {
		port: 4173,
		strictPort: true
	}
})
