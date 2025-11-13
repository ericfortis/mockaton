import { methodIsSupported } from './http-request.js'

/* https://www.w3.org/TR/2020/SPSD-cors-20200602/#resource-processing-model */

export function validateCorsAllowedOrigins(arr) {
	if (!Array.isArray(arr))
		return false
	if (arr.length === 1 && arr[0] === '*')
		return true
	return arr.every(o => URL.canParse(o))
}

export function validateCorsAllowedMethods(arr) {
	return Array.isArray(arr) && arr.every(methodIsSupported)
}


export const CorsHeader = {
	// Request
	Origin: 'origin',
	AcRequestMethod: 'access-control-request-method',
	AcRequestHeaders: 'access-control-request-headers', // Comma separated

	// Response
	AcMaxAge: 'Access-Control-Max-Age',
	AcAllowOrigin: 'Access-Control-Allow-Origin', // '*' | Space delimited | null
	AcAllowMethods: 'Access-Control-Allow-Methods', // '*' | Comma delimited
	AcAllowHeaders: 'Access-Control-Allow-Headers', // '*' | Comma delimited 
	AcExposeHeaders: 'Access-Control-Expose-Headers', // '*' | Comma delimited (headers client-side JS can read)
	AcAllowCredentials: 'Access-Control-Allow-Credentials' // 'true'
}
const CH = CorsHeader


export function isPreflight(req) {
	return req.method === 'OPTIONS'
		&& URL.canParse(req.headers[CH.Origin])
		&& methodIsSupported(req.headers[CH.AcRequestMethod])
}


export function setCorsHeaders(req, response, {
	corsOrigins = [],
	corsMethods = [],
	corsHeaders = [],
	corsExposedHeaders = [],
	corsCredentials = false,
	corsMaxAge = 0
}) {
	const reqOrigin = req.headers[CH.Origin]
	const hasWildcard = corsOrigins.some(ao => ao === '*')
	if (!reqOrigin || (!hasWildcard && !corsOrigins.includes(reqOrigin)))
		return
	response.setHeader(CH.AcAllowOrigin, reqOrigin) // Never '*', so no need to `Vary` it

	if (corsCredentials)
		response.setHeader(CH.AcAllowCredentials, 'true')

	if (req.headers[CH.AcRequestMethod])
		setPreflightSpecificHeaders(req, response, corsMethods, corsHeaders, corsMaxAge)
	else if (corsExposedHeaders.length)
		response.setHeader(CH.AcExposeHeaders, corsExposedHeaders.join(','))
}

function setPreflightSpecificHeaders(req, response, methods, headers, maxAge) {
	const methodAskingFor = req.headers[CH.AcRequestMethod]
	if (!methods.includes(methodAskingFor))
		return
	response.setHeader(CH.AcMaxAge, maxAge)
	response.setHeader(CH.AcAllowMethods, methodAskingFor)
	if (headers.length)
		response.setHeader(CH.AcAllowHeaders, headers.join(','))
}
