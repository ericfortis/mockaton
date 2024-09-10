import { Server } from 'node:http';

interface Config {
	mocksDir: string
	ignore?: RegExp

	staticDir?: string

	host?: string,
	port?: number
	proxyFallback?: string

	delay?: number
	cookies?: object
	extraHeaders?: [string, string][]
	extraMimes?: object

	onReady?: (address: string) => void
}

export function Mockaton(options: Config): Server

export function jwtCookie(cookieName: string, payload: any): string
