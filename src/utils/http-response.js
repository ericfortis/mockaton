import { readFileSync } from 'node:fs'
import { mimeFor } from './mime.js'


export function sendOK(response) {
	response.end()
}

export function sendNoContent(response) {
	response.statusCode = 204
	response.end()
}

export function sendJSON(response, payload) {
	response.setHeader('Content-Type', 'application/json')
	response.end(JSON.stringify(payload))
}

export function sendForbidden(response) {
	response.statusCode = 403
	response.end()
}

export function sendDashboardFile(response, file) {
	response.setHeader('Content-Type', mimeFor(file))
	response.end(readFileSync(file, 'utf8'))
}

export function sendNotFound(response) {
	response.statusCode = 404
	response.end()
}

export function sendUnprocessableContent(response, error) {
	console.error(error)
	response.statusCode = 422
	response.end(error)
}

export function sendInternalServerError(response, error) {
	console.error(error)
	response.statusCode = 500
	response.end()
}
