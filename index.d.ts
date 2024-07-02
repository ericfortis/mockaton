import { Server } from 'node:http';

interface Config {
	mocksDir: string
	staticDir?: string
	host?: string,
	port?: number
	delay?: number

	cookies?(): object

	database?: object
	skipOpen?: boolean
	allowedExt?: RegExp
}

export function Mockaton(options: Config): Server

export function jwtCookie(cookieName: string, payload: any): string
