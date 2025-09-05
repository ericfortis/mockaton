// You can write JSON responses in JavaScript as a function.
// Must return a String, and they must NOT call `response.end()`

export default function (req, response) {
	return JSON.stringify([
		'http://example.com/foo',
		'http://example.com/bar'
	], null, 2)
}
