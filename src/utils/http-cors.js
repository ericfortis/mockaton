import { StandardMethods } from './http-request.js'

// https://www.w3.org/TR/2020/SPSD-cors-20200602/#resource-processing-model

export const PreflightHeader = {
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
const PH = PreflightHeader


export function isPreflight(req) {
	return req.method === 'OPTIONS'
		&& URL.canParse(req.headers[PH.Origin])
		&& StandardMethods.includes(req.headers[PH.AccessControlRequestMethod])
}


export function setCorsHeaders(req, response, {
	origins = [],
	methods = [],
	headers = [],
	exposedHeaders = [],
	credentials = false,
	maxAge = 0
}) {
	const reqOrigin = req.headers[PH.Origin]
	const hasWildcard = origins.some(ao => ao === '*')
	if (!reqOrigin || (!hasWildcard && !origins.includes(reqOrigin)))
		return
	response.setHeader(PH.AccessControlAllowOrigin, reqOrigin) // Never '*', so no need to `Vary` it

	if (credentials)
		response.setHeader(PH.AccessControlAllowCredentials, 'true')

	if (req.headers[PH.AccessControlRequestMethod])
		setPreflightSpecificHeaders(req, response, methods, headers, maxAge)
	else
		setActualRequestHeaders(response, exposedHeaders)
}


function setPreflightSpecificHeaders(req, response, methods, headers, maxAge) {
	const methodAskingFor = req.headers[PH.AccessControlRequestMethod]
	if (!methods.includes(methodAskingFor))
		return

	response.setHeader(PH.AccessControlAllowMethods, methodAskingFor)
	if (headers.length)
		response.setHeader(PH.AccessControlAllowHeaders, headers.join(','))

	response.setHeader(PH.AccessControlMaxAge, maxAge)
}


function setActualRequestHeaders(response, exposedHeaders) {
	// Exposed means the client-side JavaScript can read them
	if (exposedHeaders.length)
		response.setHeader(PH.AccessControlExposeHeaders, exposedHeaders.join(','))
}
