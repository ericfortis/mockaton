import { Server } from 'node:http';

interface Config {
	mocksDir: string
	staticDir?: string
	host?: string,
	port?: number
	delay?: number
	open?: (address: string) => void
	cookies?: object
	proxyFallback?: string
	allowedExt?: RegExp
	generate500?: boolean,
	extraHeaders?: [string, string][] 
}

export function Mockaton(options: Config): Server

export function jwtCookie(cookieName: string, payload: any): string
