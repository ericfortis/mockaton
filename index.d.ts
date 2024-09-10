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
