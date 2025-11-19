chrome.runtime.onMessage.addListener(msg => {
	if (msg.action === 'DOWNLOAD_FILE')
		try {
			chrome.downloads.download({
				url: msg.url,
				filename: msg.filename,
				saveAs: false
			})
		}
		catch (error) {
			console.error(error)
		}
})
