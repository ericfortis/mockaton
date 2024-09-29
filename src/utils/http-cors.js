import { StandardMethods } from './http-request.js'

// https://www.w3.org/TR/2020/SPSD-cors-20200602/#resource-processing-model

export const CorsHeader = {
	// request
	Origin: 'origin',
	AccessControlRequestMethod: 'access-control-request-method',
	AccessControlRequestHeaders: 'access-control-request-headers', // Comma separated

	// response
	AccessControlMaxAge: 'Access-Control-Max-Age',
	AccessControlAllowOrigin: 'Access-Control-Allow-Origin', // '*' | Space delimited | null
	AccessControlAllowMethods: 'Access-Control-Allow-Methods', // '*' | Comma delimited
	AccessControlAllowHeaders: 'Access-Control-Allow-Headers', // '*' | Comma delimited 
	AccessControlExposeHeaders: 'Access-Control-Expose-Headers', // '*' | Comma delimited 
	AccessControlAllowCredentials: 'Access-Control-Allow-Credentials' // 'true'
}
const CH = CorsHeader


export function isPreflight(req) {
	return req.method === 'OPTIONS'
		&& URL.canParse(req.headers[CH.Origin])
		&& StandardMethods.includes(req.headers[CH.AccessControlRequestMethod])
}


export function setCorsHeaders(req, response, {
	origins = [],
	methods = [],
	headers = [],
	exposedHeaders = [],
	credentials = false,
	maxAge = 0
}) {
	const reqOrigin = req.headers[CH.Origin]
	const hasWildcard = origins.some(ao => ao === '*')
	if (!reqOrigin || (!hasWildcard && !origins.includes(reqOrigin)))
		return
	response.setHeader(CH.AccessControlAllowOrigin, reqOrigin) // Never '*', so no need to `Vary` it

	if (credentials)
		response.setHeader(CH.AccessControlAllowCredentials, 'true')

	if (req.headers[CH.AccessControlRequestMethod])
		setPreflightSpecificHeaders(req, response, methods, headers, maxAge)
	else
		setActualRequestHeaders(response, exposedHeaders)
}


function setPreflightSpecificHeaders(req, response, methods, headers, maxAge) {
	const methodAskingFor = req.headers[CH.AccessControlRequestMethod]
	if (!methods.includes(methodAskingFor))
		return

	response.setHeader(CH.AccessControlAllowMethods, methodAskingFor)
	if (headers.length)
		response.setHeader(CH.AccessControlAllowHeaders, headers.join(','))

	response.setHeader(CH.AccessControlMaxAge, maxAge)
}


function setActualRequestHeaders(response, exposedHeaders) {
	// Exposed means the client-side JavaScript can read them
	if (exposedHeaders.length)
		response.setHeader(CH.AccessControlExposeHeaders, exposedHeaders.join(','))
}
