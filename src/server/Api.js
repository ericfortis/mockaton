/**
 * API for controlling Mockaton. For example, for
 * selecting a specific mock-file for a particular route.
 */

import { join, relative } from 'node:path'

import { write, rm, isFile, resolveIn } from './utils/fs.js'
import { removeQueryStringAndFragment } from './utils/HttpIncomingMessage.js'
import { sseClientHotReload } from './utils/WatcherDevClient.js'

import pkgJSON from '../../package.json' with { type: 'json' }
import openapi from '../../www/src/assets/openapi.json' with { type: 'json' }

import { API } from '../client/ApiConstants.js'
import { IndexHtml, CSP } from '../client/IndexHtml.js'

import { cookie } from './stores/cookies.js'
import { config, ConfigValidator, reinitConfig } from './stores/config.js'
import * as brokers from './stores/brokers.js'
import * as Watcher from './stores/Watcher.js'


export const CLIENT_ASSETS = join(import.meta.dirname, '../client')

const headReqs = new Map([
	[API.health, (_, response) => response.ok()]
])

const getReqs = new Map([
	...headReqs.entries(),

	[API.root, serveDashboard],
	[API.state, getState],
	[API.syncVersion, Watcher.sseClientSyncVersion],

	[API.watchHotReload, onDevWatch],
	[API.openAPI, (_, response) => response.json(openapi)],
	[API.throws, () => { throw new Error('Test500') }]
])

const patchReqs = new Map([
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

export async function handleApiRequest(req, response) {
	if (!req.url.startsWith(API.root))
		return false

	const url = removeQueryStringAndFragment(req.url)

	const handler = (
		req.method === 'GET' && getReqs.get(url) ||
		req.method === 'HEAD' && headReqs.get(url) ||
		req.method === 'PATCH' && patchReqs.get(url))
	if (handler) {
		await handler(req, response)
		return true
	}

	if (req.method === 'GET') { // serve static dashboard assets dir
		const f = await resolveIn(CLIENT_ASSETS, relative(API.root, url))
		await response.file(f)
		return true
	}
}


/** # GET */

function serveDashboard(_, response) {
	response.html(IndexHtml(config.hotReload, pkgJSON.version), CSP)
}


function getState(_, response) {
	response.json({
		cookies: cookie.list(),
		comments: brokers.extractAllComments(),

		brokersByMethod: brokers.all(),

		delay: config.delay,
		delayJitter: config.delayJitter,

		proxyFallback: config.proxyFallback,
		collectProxied: config.collectProxied,
		readOnly: config.readOnly,
		corsAllowed: config.corsAllowed
	})
}

function onDevWatch(req, response) {
	if (config.hotReload)
		sseClientHotReload(req, response)
	else
		response.notFound()
}

/** # PATCH */

function reset(_, response) {
	reinitConfig()
	brokers.init()
	cookie.init(config.cookies)
	response.ok()
	Watcher.emitChange()
}


async function setCorsAllowed(req, response) {
	const corsAllowed = await req.json()
	const err = ConfigValidator.corsAllowed(corsAllowed)
	if (err)
		response.unprocessable(err)
	else {
		config.corsAllowed = corsAllowed
		response.ok()
		Watcher.emitChange()
	}
}


async function setGlobalDelay(req, response) {
	const delay = await req.json()
	const err = ConfigValidator.delay(delay)
	if (err)
		response.unprocessable(err)
	else {
		config.delay = delay
		response.ok()
		Watcher.emitChange()
	}
}

async function setGlobalDelayJitter(req, response) {
	const jitter = await req.json()
	const err = ConfigValidator.delayJitter(jitter)
	if (err)
		response.unprocessable(err)
	else {
		config.delayJitter = jitter
		response.ok()
		Watcher.emitChange()
	}
}


async function selectCookie(req, response) {
	const cookieKey = await req.json()
	const error = cookie.setCurrent(cookieKey)
	if (error)
		response.unprocessable(error?.message || error)
	else {
		response.json(cookie.list())
		Watcher.emitChange()
	}
}


async function setProxyFallback(req, response) {
	const fallback = await req.json()
	const err = ConfigValidator.proxyFallback(fallback)
	if (err)
		response.unprocessable(err)
	else {
		config.proxyFallback = fallback
		response.ok()
		Watcher.emitChange()
	}
}

async function setCollectProxied(req, response) {
	const collectProxied = await req.json()
	const err = ConfigValidator.collectProxied(collectProxied)
	if (err)
		response.unprocessable(err)
	else {
		config.collectProxied = collectProxied
		response.ok()
		Watcher.emitChange()
	}
}



async function bulkUpdateBrokersByCommentTag(req, response) {
	const comment = await req.json()
	brokers.setMocksMatchingComment(comment)
	response.ok()
	Watcher.emitChange()
}


async function selectMock(req, response) {
	const file = await req.json()
	const broker = brokers.brokerByFilename(file)
	if (!broker || !broker.hasMock(file))
		response.unprocessable(`Missing Mock: ${file}`)
	else {
		broker.selectFile(file)
		response.json(broker)
		Watcher.emitChange()
	}
}


async function toggleRouteStatus(req, response) {
	const [method, urlMask, status] = await req.json()
	const broker = brokers.brokerByRoute(method, urlMask)
	if (!broker)
		response.unprocessable(`Route does not exist: ${method} ${urlMask}`)
	else {
		broker.toggleStatus(status)
		response.json(broker)
		Watcher.emitChange()
	}
}


async function setRouteIsDelayed(req, response) {
	const [method, urlMask, delayed] = await req.json()
	const broker = brokers.brokerByRoute(method, urlMask)
	if (!broker)
		response.unprocessable(`Route does not exist: ${method} ${urlMask}`)
	else if (typeof delayed !== 'boolean')
		response.unprocessable(`Expected boolean for "delayed"`)
	else {
		broker.setDelayed(delayed)
		response.json(broker)
		Watcher.emitChange()
	}
}


async function setRouteIsProxied(req, response) {
	const [method, urlMask, proxied] = await req.json()
	const broker = brokers.brokerByRoute(method, urlMask)
	if (!broker)
		response.unprocessable(`Route does not exist: ${method} ${urlMask}`)
	else if (typeof proxied !== 'boolean')
		response.unprocessable(`Expected boolean for "proxied"`)
	else if (proxied && !config.proxyFallback)
		response.unprocessable(`There’s no proxy fallback`)
	else {
		broker.setProxied(proxied)
		response.json(broker)
		Watcher.emitChange()
	}
}


async function writeMock(req, response) {
	if (config.readOnly) {
		response.forbidden('Forbidden: Mockaton is in read-only mode. See config.readOnly')
		return
	}
	const [file, content] = await req.json()
	if (typeof file !== 'string') {
		response.unprocessable('Invalid or missing filename. Expected: JSON [filename, content]')
		return
	}
	const path = await resolveIn(config.mocksDir, file)
	if (!path) {
		response.forbidden('Filename path resolves outside config.mocksDir')
		return
	}
	await write(path, content)
	if (!config.watcherEnabled) {
		brokers.registerMock(file, true)
		Watcher.emitChange()
	}
	response.ok()
}


async function deleteMock(req, response) {
	if (config.readOnly) {
		response.forbidden('Forbidden: Mockaton is in read-only mode. See config.readOnly')
		return
	}
	const file = await req.json()
	const path = await resolveIn(config.mocksDir, file)

	if (!path)
		response.forbidden('Filename path resolves outside config.mocksDir')
	else if (!isFile(path))
		response.unprocessable(`Missing Mock: ${file}`)
	else
		await rm(path)

	if (!config.watcherEnabled) {
		brokers.unregisterMock(file)
		Watcher.emitChange()
	}
	response.ok()
}



async function setWatchMocks(req, response) {
	const enabled = await req.json()
	if (typeof enabled !== 'boolean')
		response.unprocessable(`Expected boolean for "watchMocks"`)
	else {
		if (enabled)
			Watcher.watchMocksDir()
		else
			Watcher.unwatchMocksDir()
		response.ok()
	}
}

