// This is an example "transform". It takes the mock for the same route as
// input, so you can modify it. In this case, it uses the `database` field.

export default function concatNewlyUploadedVideos(mockAsText, _, config) {
	const mockList = JSON.parse(mockAsText)
	mockList.videos = mockList.videos.concat(config.database.videos || [])
	return JSON.stringify(mockList, null, 2)
}