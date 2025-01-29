import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


export default defineConfig({
	plugins: [react()],
	server: {
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
