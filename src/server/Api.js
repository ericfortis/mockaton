/**
 * API for controlling Mockaton. For example, for
 * selecting a specific mock-file for a particular route.
 */

import { join } from 'node:path'

import pkgJSON from '../../package.json' with { type: 'json' }

import { sseClientHotReload, DASHBOARD_ASSETS, CLIENT_DIR } from './WatcherDevClient.js'
import { stopMocksDirWatcher, sseClientSyncVersion, uiSyncVersion, watchMocksDir } from './Watcher.js'

import { API } from '../client/ApiConstants.js'
import { IndexHtml, CSP } from '../client/IndexHtml.js'

import { cookie } from './cookie.js'
import { config, ConfigValidator } from './config.js'
import * as mockBrokersCollection from './mockBrokersCollection.js'
import { write, rm, isFile, resolveIn } from './utils/fs.js'


export const apiGetReqs = new Map([
	[API.dashboard, serveDashboard],
	...DASHBOARD_ASSETS.map(f => [API.dashboard + '/' + f, serveStatic(f)]),

	[API.state, getState],
	[API.syncVersion, sseClientSyncVersion],

	[API.watchHotReload, sseClientHotReload],
	[API.throws, () => { throw new Error('Test500') }]
])


export const apiPatchReqs = new Map([
	[API.cors, setCorsAllowed],
	[API.reset, reset],
	[API.cookies, selectCookie],
	[API.globalDelay, setGlobalDelay],
	[API.globalDelayJitter, setGlobalDelayJitter],

	[API.fallback, setProxyFallback],
	[API.collectProxied, setCollectProxied],

	[API.bulkSelect, bulkUpdateBrokersByCommentTag],

	[API.delay, setRouteIsDelayed],
	[API.select, selectMock],
	[API.proxied, setRouteIsProxied],
	[API.toggleStatus, toggleRouteStatus],

	[API.writeMock, writeMock],
	[API.deleteMock, deleteMock],
	[API.watchMocks, setWatchMocks]
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

		delay: config.delay,
		delayJitter: config.delayJitter,

		proxyFallback: config.proxyFallback,
		collectProxied: config.collectProxied,
		readOnly: config.readOnly,
		corsAllowed: config.corsAllowed
	})
}


/** # PATCH */

function reset(_, response) {
	mockBrokersCollection.init()
	cookie.init(config.cookies)
	response.ok()
	uiSyncVersion.increment()
}


async function setCorsAllowed(req, response) {
	const corsAllowed = await req.json()

	if (!ConfigValidator.corsAllowed(corsAllowed))
		response.unprocessable(`Expected boolean for "corsAllowed"`)
	else {
		config.corsAllowed = corsAllowed
		response.ok()
		uiSyncVersion.increment()
	}
}


async function setGlobalDelay(req, response) {
	const delay = await req.json()

	if (!ConfigValidator.delay(delay))
		response.unprocessable(`Expected non-negative integer for "delay"`)
	else {
		config.delay = delay
		response.ok()
		uiSyncVersion.increment()
	}
}

async function setGlobalDelayJitter(req, response) {
	const jitter = await req.json()

	if (!ConfigValidator.delayJitter(jitter))
		response.unprocessable(`Expected 0 to 3 float for "delayJitter"`)
	else {
		config.delayJitter = jitter
		response.ok()
		uiSyncVersion.increment()
	}
}


async function selectCookie(req, response) {
	const cookieKey = await req.json()

	const error = cookie.setCurrent(cookieKey)
	if (error)
		response.unprocessable(error?.message || error)
	else {
		response.json(cookie.list())
		uiSyncVersion.increment()
	}
}


async function setProxyFallback(req, response) {
	const fallback = await req.json()

	if (!ConfigValidator.proxyFallback(fallback))
		response.unprocessable(`Invalid Proxy Fallback URL`)
	else {
		config.proxyFallback = fallback
		response.ok()
		uiSyncVersion.increment()
	}
}

async function setCollectProxied(req, response) {
	const collectProxied = await req.json()

	if (!ConfigValidator.collectProxied(collectProxied))
		response.unprocessable(`Expected a boolean for "collectProxied"`)
	else {
		config.collectProxied = collectProxied
		response.ok()
		uiSyncVersion.increment()
	}
}



async function bulkUpdateBrokersByCommentTag(req, response) {
	const comment = await req.json()

	mockBrokersCollection.setMocksMatchingComment(comment)
	response.ok()
	uiSyncVersion.increment()
}


async function selectMock(req, response) {
	const file = await req.json()

	const broker = mockBrokersCollection.brokerByFilename(file)
	if (!broker || !broker.hasMock(file))
		response.unprocessable(`Missing Mock: ${file}`)
	else {
		broker.selectFile(file)
		response.json(broker)
		uiSyncVersion.increment()
	}
}


async function toggleRouteStatus(req, response) {
	const [method, urlMask, status] = await req.json()

	const broker = mockBrokersCollection.brokerByRoute(method, urlMask)
	if (!broker)
		response.unprocessable(`Route does not exist: ${method} ${urlMask}`)
	else {
		broker.toggleStatus(status)
		response.json(broker)
		uiSyncVersion.increment()
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
		uiSyncVersion.increment()
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
		uiSyncVersion.increment()
	}
}


async function writeMock(req, response) {
	if (config.readOnly)
		return response.forbidden()

	const [file, content] = await req.json()
	const path = await resolveIn(config.mocksDir, file)

	if (!path)
		return response.forbidden()

	await write(path, content)

	if (!config.watcherEnabled) {
		mockBrokersCollection.registerMock(file, true)
		uiSyncVersion.increment()
	}
	response.ok()
}


async function deleteMock(req, response) {
	if (config.readOnly)
		return response.forbidden()

	const file = await req.json()
	const path = await resolveIn(config.mocksDir, file)

	if (!path)
		return response.forbidden()

	if (!isFile(path))
		return response.unprocessable(`Missing Mock: ${file}`)

	await rm(path)

	if (!config.watcherEnabled) {
		mockBrokersCollection.unregisterMock(file)
		uiSyncVersion.increment()
	}
	response.ok()
}



async function setWatchMocks(req, response) {
	const enabled = await req.json()

	if (typeof enabled !== 'boolean')
		response.unprocessable(`Expected boolean for "watchMocks"`)
	else {
		if (enabled)
			watchMocksDir()
		else
			stopMocksDirWatcher()
		response.ok()
	}
}

