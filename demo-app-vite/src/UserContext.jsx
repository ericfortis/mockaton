import { createContext } from 'react'
import { useCookies } from 'react-cookie'


export const UserContext = createContext(null)

export function UserContextProvider({ children }) {
	const [cookies] = useCookies()
	const user = parseJwt(cookies.id_token) || {}

	return (
		<UserContext.Provider value={{
			name: user.name ?? '',
			isAdmin: (user.roles || []).includes('ADMIN')
		}}>
			{children}
		</UserContext.Provider>
	)
}


// https://stackoverflow.com/questions/38552003/how-to-decode-jwt-token-in-javascript-without-using-a-library
function parseJwt(token) {
	if (!token)
		return
	try {
		const payloadBase64Url = token.split('.')[1]
		const base64 = payloadBase64Url.replace('-', '+').replace('_', '/')
		return JSON.parse(window.atob(base64))
	}
	catch (_) {
		return 'Error parsing JWT token'
	}
}
