// An example "transform" for saving a POST request payload into the `config.database`

export default function concatNewlyUploadedVideos(mockAsText, requestBody, config) {
	config.database.videos ??= []
	config.database.videos.push({
		createdAt: Date.now(),
		...requestBody
	})
	return JSON.stringify({})
}