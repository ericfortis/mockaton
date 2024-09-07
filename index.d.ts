import { Server } from 'node:http';

interface Config {
	mocksDir: string
	staticDir?: string
	host?: string,
	port?: number
	delay?: number
	onReady?: (address: string) => void
	cookies?: object
	proxyFallback?: string
	allowedExt?: RegExp
	extraHeaders?: [string, string][] 
}

export function Mockaton(options: Config): Server

export function jwtCookie(cookieName: string, payload: any): string
