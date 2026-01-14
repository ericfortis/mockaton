import { Server, IncomingMessage, OutgoingMessage } from 'node:http'

export type Plugin = (
	filePath: string,
	request: IncomingMessage,
	response: OutgoingMessage
) => Promise<{
	mime: string
	body: string | Uint8Array
}>

export interface Config {
	mocksDir?: string
	staticDir?: string
	ignore?: RegExp
	watcherEnabled?: boolean
	watcherDebounceMs?: number

	host?: string,
	port?: number

	logLevel?: 'normal' | 'verbose' | 'quiet'

	delay?: number
	delayJitter?: number

	proxyFallback?: string
	collectProxied?: boolean
	formatCollectedJSON?: boolean

	cookies?: { [label: string]: string }
	extraHeaders?: string[]
	extraMimes?: { [fileExt: string]: string }

	corsAllowed?: boolean
	corsOrigins?: string[]
	corsMethods?: string[]
	corsHeaders?: string[]
	corsExposedHeaders?: string[]
	corsCredentials?: boolean
	corsMaxAge?: number


	plugins?: [filenameTester: RegExp, plugin: Plugin][]

	onReady?: (address: string) => void
	
	hotReload?: boolean // For UI dev purposes only
}


export function Mockaton(options: Partial<Config>): Promise<Server | undefined>

export function defineConfig(options: Partial<Config>): Partial<Config>

export const jsToJsonPlugin: Plugin


// Utils

export function jwtCookie(cookieName: string, payload: any, path?: string): string

export function parseJSON(request: IncomingMessage): Promise<any>

export type JsonPromise<T> = Promise<Response & { json(): Promise<T> }>


// API

export type ClientMockBroker = {
	mocks: string[]
	file: string
	status: number
	auto500: boolean
	delayed: boolean
	proxied: boolean
}
export type ClientBrokersByMethod = {
	[method: string]: {
		[urlMask: string]: ClientMockBroker
	}
}

export type ClientStaticBroker = {
	route: string
	delayed: boolean
	status: number
}
export type ClientStaticBrokers = {
	[route: string]: ClientStaticBroker
}


export interface State {
	brokersByMethod: ClientBrokersByMethod
	staticBrokers: ClientStaticBrokers

	cookies: [label: string, selected: boolean][]
	comments: string[]

	delay: number
	delayJitter: number

	collectProxied: boolean
	proxyFallback: string

	corsAllowed?: boolean
}
