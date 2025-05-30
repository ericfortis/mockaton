export function jwtCookie(cookieName, payload, path = '/') {
	return [
		`${cookieName}=${jwt(payload)}`,
		`Path=${path}`,
		'SameSite=strict'
	].join(';')
}

function jwt(payload) {
	return [
		'Header_Not_In_Use',
		toBase64Url(payload),
		'Signature_Not_In_Use'
	].join('.')
}

function toBase64Url(obj) {
	return btoa(JSON.stringify(obj))
		.replace('+', '-')
		.replace('/', '_')
}
