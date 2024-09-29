import { Server } from 'node:http';

interface Config {
	mocksDir: string
	ignore?: RegExp

	staticDir?: string

	host?: string,
	port?: number
	proxyFallback?: string

	delay?: number
	cookies?: { [label: string]: string }
	extraHeaders?: [string, string][]
	extraMimes?: { [fileExt: string]: string }

	corsAllowed?: boolean,
	corsOrigins: string[]
	corsMethods: string[]
	corsHeaders: string[]
	corsExposedHeaders: string[]
	corsCredentials: boolean
	corsMaxAge: number

	onReady?: (address: string) => void
}


export function Mockaton(options: Config): Server


export function jwtCookie(cookieName: string, payload: any): string


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
