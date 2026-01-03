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
		Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url'),
		'Signature_Not_In_Use'
	].join('.')
}

