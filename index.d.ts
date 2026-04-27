import { Server, IncomingMessage, OutgoingMessage } from 'node:http'

export declare type Plugin = (
	filePath: string,
	request: IncomingMessage,
	response: OutgoingMessage
) => Promise<{
	mime: string
	body: string | Uint8Array
}>

export declare interface Config {
	mocksDir?: string
	ignore?: RegExp
	watcherEnabled?: boolean
	watcherDebounceMs?: number
	readOnly?: boolean

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
	bypassImportCache?: boolean 
}


export declare function Mockaton(options: Partial<Config>): Promise<Server | undefined>

export declare function defineConfig(options: Partial<Config>): Partial<Config>

export declare const jsToJsonPlugin: Plugin
export declare const echoFilePlugin: Plugin


// Utils

export declare function jwtCookie(cookieName: string, payload: any, path?: string): string

export declare function parseJSON(request: IncomingMessage): Promise<any>
export declare function parseSegments(reqUrl: string, filename: string): Record<string, string>
export declare function parseQueryParams(reqUrl: string): URLSearchParams

export declare type JsonPromise<T> = Promise<Response & { json(): Promise<T> }>


// API

export declare type ClientMockBroker = {
	mocks: string[]
	file: string
	status: number
	isStatic: boolean
	autoStatus: number
	delayed: boolean
	proxied: boolean
}
export declare type ClientBrokersByMethod = {
	[method: string]: {
		[urlMask: string]: ClientMockBroker
	}
}

export declare interface State {
	brokersByMethod: ClientBrokersByMethod

	cookies: [label: string, selected: boolean][]
	comments: string[]

	delay: number
	delayJitter: number

	collectProxied: boolean
	proxyFallback: string

	readOnly: boolean

	corsAllowed?: boolean
}
