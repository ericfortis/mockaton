// You can write JSON responses in JavaScript as a function.
// Must return a String and they should NOT call `response.end()`

export default function (req, response) {
	return JSON.stringify([
		{ id: 0 }
	])
}
