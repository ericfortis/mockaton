import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mockatonPlugin from 'mockaton/vite'
import mockatonConfig from './mockaton.config.js'


export default defineConfig({
	plugins: [
		react(),
		mockatonPlugin(mockatonConfig)
	],

	server: {
		port: 3030,
		open: false,
		host: true,
		proxy: {
			'/api': {
				target: `http://localhost:${mockatonConfig.port}`,
				changeOrigin: true
			}
		}
	},

	preview: {
		port: 4173,
		strictPort: true
	}
})
