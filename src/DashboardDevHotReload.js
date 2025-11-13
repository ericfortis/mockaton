import { API } from './ApiConstants.js'


longPoll()
async function longPoll() {
	try {
		const response = await fetch(API.watchHotReload)
		if (response.ok) {
			const editedFile = await response.json()
			if (editedFile) 
				location.reload()
			else
				longPoll()
		}
		else 
			throw response.statusText
	}
	catch (error) {
		console.error('hot reload', error?.message || error)
		setTimeout(longPoll, 3000)
	}
}
