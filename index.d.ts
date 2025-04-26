import { Server, IncomingMessage, OutgoingMessage } from 'node:http';

type Plugin = (
	filePath: string,
	request: IncomingMessage,
	response: OutgoingMessage
) => Promise<{
	mime: string,
	body: string | Uint8Array
}>

interface Config {
	mocksDir: string
	staticDir?: string
	ignore?: RegExp

	host?: string,
	port?: number

	proxyFallback?: string
	collectProxied?: boolean
	formatCollectedJSON?: boolean

	delay?: number
	cookies?: { [label: string]: string }
	extraHeaders?: string[]
	extraMimes?: { [fileExt: string]: string }

	plugins?: [filenameTester: RegExp, plugin: Plugin][]

	corsAllowed?: boolean,
	corsOrigins?: string[]
	corsMethods?: string[]
	corsHeaders?: string[]
	corsExposedHeaders?: string[]
	corsCredentials?: boolean
	corsMaxAge?: number

	onReady?: (address: string) => void
}


export function Mockaton(options: Config): Server

export const jsToJsonPlugin: Plugin


// Utils

export function jwtCookie(cookieName: string, payload: any, path?: string): string

export function parseJSON(request: IncomingMessage): Promise<any>


export class Commander {
	constructor(addr: string)

	listMocks(): Promise<Response>

	select(file: string): Promise<Response>

	bulkSelectByComment(comment: string): Promise<Response>


	setRouteIsDelayed(routeMethod: string, routeUrlMask: string, delayed: boolean): Promise<Response>


	listCookies(): Promise<Response>

	selectCookie(cookieKey: string): Promise<Response>


	listComments(): Promise<Response>

	setProxyFallback(proxyAddr: string): Promise<Response>

	reset(): Promise<Response>


	getCorsAllowed(): Promise<Response>

	setCorsAllowed(value: boolean): Promise<Response>
}
