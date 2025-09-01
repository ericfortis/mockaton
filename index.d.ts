import { Server, IncomingMessage, OutgoingMessage } from 'node:http';
import { MockBroker } from './src/MockBroker.js'
import { StaticBroker } from './src/staticCollection.js'

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
	delayJitter?: number

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


export type ClientMockBroker = {
	mocks: string[]
	currentMock: {
		file: string
		delayed: boolean
	}
}
export type ClientBrokersByMethod = {
	[method: string]: {
		[urlMask: string]: ClientMockBroker
	}
}

export type ClientStaticBroker = {
	route: string
	delayed: boolean
	status: number
}
export type ClientStaticBrokers = {
	[route: string]: ClientMockBroker
}

export type JsonPromise<T> = Promise<Response & { json(): Promise<T> }>

