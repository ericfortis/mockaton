import { Server } from 'node:http';

interface Config {
	mocksDir: string
	staticDir?: string
	host?: string,
	port?: number
	ignore?: RegExp
	delay?: number
	onReady?: (address: string) => void
	cookies?: object
	proxyFallback?: string
	extraHeaders?: [string, string][]
	extraMimes?: object
}

export function Mockaton(options: Config): Server

export function jwtCookie(cookieName: string, payload: any): string
