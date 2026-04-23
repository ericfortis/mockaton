import { Mockaton } from 'mockaton'


export default function (options = {}) {
	let mockatonServer

	return {
		name: 'mockaton-vite-plugin',

		async configureServer(viteServer) {
			mockatonServer = await Mockaton(options)
			viteServer.httpServer?.on('close', () => {
				mockatonServer?.close()
			})
		},

		async buildEnd() {
			mockatonServer?.close()
		}
	}
}
