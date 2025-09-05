export { Mockaton } from './src/Mockaton.js'
export { Commander } from './src/ApiCommander.js'

export { jwtCookie } from './src/utils/jwt.js'
export { openInBrowser } from './src/utils/openInBrowser.js'
export { jsToJsonPlugin } from './src/MockDispatcher.js'
export { parseJSON, SUPPORTED_METHODS } from './src/utils/http-request.js'

/** @param {Partial<Config>} opts */
export const defineConfig = opts => opts
