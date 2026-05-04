import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mockatonPlugin from 'mockaton/vite'
import mockatonConfig from './mockaton.config.js'


const MOCKATON_PORT = 4040

export default defineConfig({
	plugins: [
		react(),
		mockatonPlugin({
			...mockatonConfig,
			port: MOCKATON_PORT,
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
