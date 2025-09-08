// You can write JSON responses in JavaScript as a function.
// Must return a String, and they must NOT call `response.end()`

export default function (req, response) {
	const linksList = {}
	for (let i = 1; i <= 200; i++)
		linksList[i] = [
			`http://example.com/a${i}`,
			`http://example.com/b${i}`,
		]
	return JSON.stringify(linksList, null, 2)
}

// This mock is used for stress testing the syntaxJSON highlighter.
// Currently, after X number of nodes, we stop highlighting so
// it doesn't choke the browser.



