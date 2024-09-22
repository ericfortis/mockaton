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

	onReady?: (address: string) => void
}


export function Mockaton(options: Config): Server


export function jwtCookie(cookieName: string, payload: any): string


export class Commander {
	constructor(addr: string)

	select(file: string): Promise<Response>

	bulkSelectByComment(comment: string): Promise<Response>

	setRouteIsDelayed(routeMethod: string, routeUrlMask: string, delayed: boolean): Promise<Response>

	selectCookie(cookieKey: string): Promise<Response>

	setProxyFallback(proxyAddr: string): Promise<Response>

	reset(): Promise<Response>

	listCookies(): Promise<Response>

	listComments(): Promise<Response>
}
