import { type Config } from 'mockaton'
import { type Plugin } from 'vite'

declare function mockatonPlugin(options: Config): Plugin;
export default mockatonPlugin
