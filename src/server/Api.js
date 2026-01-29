/**
 * API for controlling Mockaton. For example, for
 * selecting a specific mock-file for a particular route.
 */

import { join } from 'node:path'

import {
	longPollDevClientHotReload,
	DASHBOARD_ASSETS,
	CLIENT_DIR
} from './WatcherDevClient.js'
import { longPollClientSyncVersion } from './Watcher.js'

import pkgJSON from '../../package.json' with { type: 'json' }
import { IndexHtml, CSP } from '../client/indexHtml.js'

import { API } from './ApiConstants.js'
import { cookie } from './cookie.js'
import { config, ConfigValidator } from './config.js'

import * as staticCollection from './staticCollection.js'
import * as mockBrokersCollection from './mockBrokersCollection.js'


export const apiGetReqs = new Map([
	[API.dashboard, serveDashboard],
	...DASHBOARD_ASSETS.map(f => [API.dashboard + '/' + f, serveStatic(f)]),

	[API.state, getState],
	[API.syncVersion, longPollClientSyncVersion],

	[API.watchHotReload, longPollDevClientHotReload],
	[API.throws, () => { throw new Error('Test500') }]
])


export const apiPatchReqs = new Map([
	[API.cors, setCorsAllowed],
	[API.reset, reinitialize],
	[API.cookies, selectCookie],
	[API.globalDelay, setGlobalDelay],
	[API.globalDelayJitter, setGlobalDelayJitter],

	[API.fallback, setProxyFallback],
	[API.collectProxied, setCollectProxied],

	[API.bulkSelect, bulkUpdateBrokersByCommentTag],

	[API.delay, setRouteIsDelayed],
	[API.select, selectMock],
	[API.proxied, setRouteIsProxied],
	[API.toggle500, toggleRoute500],

	[API.delayStatic, setStaticRouteIsDelayed],
	[API.staticStatus, setStaticRouteStatusCode]
])


/** # GET */

function serveDashboard(_, response) {
	response.html(IndexHtml(config.hotReload, pkgJSON.version), CSP)
}

function serveStatic(f) {
	return (_, response) => {
		response.file(join(CLIENT_DIR, f))
	}
}

function getState(_, response) {
	response.json({
		cookies: cookie.list(),
		comments: mockBrokersCollection.extractAllComments(),

		brokersByMethod: mockBrokersCollection.all(),
		staticBrokers: staticCollection.all(),

		delay: config.delay,
		delayJitter: config.delayJitter,

		proxyFallback: config.proxyFallback,
		collectProxied: config.collectProxied,
		corsAllowed: config.corsAllowed
	})
}


/** # PATCH */

function reinitialize(_, response) {
	mockBrokersCollection.init()
	staticCollection.init()
	response.ok()
}


async function setCorsAllowed(req, response) {
	const corsAllowed = await req.json()

	if (!ConfigValidator.corsAllowed(corsAllowed))
		response.unprocessable(`Expected boolean for "corsAllowed"`)
	else {
		config.corsAllowed = corsAllowed
		response.ok()
	}
}


async function setGlobalDelay(req, response) {
	const delay = await req.json()

	if (!ConfigValidator.delay(delay))
		response.unprocessable(`Expected non-negative integer for "delay"`)
	else {
		config.delay = delay
		response.ok()
	}
}

async function setGlobalDelayJitter(req, response) {
	const jitter = await req.json()

	if (!ConfigValidator.delayJitter(jitter))
		response.unprocessable(`Expected 0 to 3 float for "delayJitter"`)
	else {
		config.delayJitter = jitter
		response.ok()
	}
}


async function selectCookie(req, response) {
	const cookieKey = await req.json()

	const error = cookie.setCurrent(cookieKey)
	if (error)
		response.unprocessable(error?.message || error)
	else
		response.json(cookie.list())
}


async function setProxyFallback(req, response) {
	const fallback = await req.json()

	if (!ConfigValidator.proxyFallback(fallback))
		response.unprocessable(`Invalid Proxy Fallback URL`)
	else {
		config.proxyFallback = fallback
		response.ok()
	}
}

async function setCollectProxied(req, response) {
	const collectProxied = await req.json()

	if (!ConfigValidator.collectProxied(collectProxied))
		response.unprocessable(`Expected a boolean for "collectProxied"`)
	else {
		config.collectProxied = collectProxied
		response.ok()
	}
}



async function bulkUpdateBrokersByCommentTag(req, response) {
	const comment = await req.json()

	mockBrokersCollection.setMocksMatchingComment(comment)
	response.ok()
}


async function selectMock(req, response) {
	const file = await req.json()

	const broker = mockBrokersCollection.brokerByFilename(file)
	if (!broker || !broker.hasMock(file))
		response.unprocessable(`Missing Mock: ${file}`)
	else {
		broker.selectFile(file)
		response.json(broker)
	}
}


async function toggleRoute500(req, response) {
	const [method, urlMask] = await req.json()

	const broker = mockBrokersCollection.brokerByRoute(method, urlMask)
	if (!broker)
		response.unprocessable(`Route does not exist: ${method} ${urlMask}`)
	else {
		broker.toggle500()
		response.json(broker)
	}
}


async function setRouteIsDelayed(req, response) {
	const [method, urlMask, delayed] = await req.json()

	const broker = mockBrokersCollection.brokerByRoute(method, urlMask)
	if (!broker)
		response.unprocessable(`Route does not exist: ${method} ${urlMask}`)
	else if (typeof delayed !== 'boolean')
		response.unprocessable(`Expected boolean for "delayed"`)
	else {
		broker.setDelayed(delayed)
		response.json(broker)
	}
}


async function setRouteIsProxied(req, response) {
	const [method, urlMask, proxied] = await req.json()

	const broker = mockBrokersCollection.brokerByRoute(method, urlMask)
	if (!broker)
		response.unprocessable(`Route does not exist: ${method} ${urlMask}`)
	else if (typeof proxied !== 'boolean')
		response.unprocessable(`Expected boolean for "proxied"`)
	else if (proxied && !config.proxyFallback)
		response.unprocessable(`There’s no proxy fallback`)
	else {
		broker.setProxied(proxied)
		response.json(broker)
	}
}



async function setStaticRouteStatusCode(req, response) {
	const [route, status] = await req.json()

	const broker = staticCollection.brokerByRoute(route)
	if (!broker)
		response.unprocessable(`Static route does not exist: ${route}`)
	else if (!(status === 200 || status === 404))
		response.unprocessable(`Expected 200 or 404 status code`)
	else {
		broker.setStatus(status)
		response.ok()
	}
}


async function setStaticRouteIsDelayed(req, response) {
	const [route, delayed] = await req.json()

	const broker = staticCollection.brokerByRoute(route)
	if (!broker)
		response.unprocessable(`Static route does not exist: ${route}`)
	else if (typeof delayed !== 'boolean')
		response.unprocessable(`Expected boolean for "delayed"`)
	else {
		broker.setDelayed(delayed)
		response.ok()
	}
}
