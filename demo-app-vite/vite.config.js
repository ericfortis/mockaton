import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


export default defineConfig({
	plugins: [react()],
	server: {
		port: 3030,
		open: true,
		host: true,
		proxy: {
			'/api': {
				target: process.env.BACKEND,
				changeOrigin: true
			}
		}
	}
})
