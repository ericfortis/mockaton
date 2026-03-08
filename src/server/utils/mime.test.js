import { test } from 'node:test'
import { equal } from 'node:assert/strict'
import { extFor, mimeFor } from './mime.js'


test('extFor', () => [
	'text/html',
	'Text/html',
	'text/Html; charset=UTF-16'
].map(input =>
	equal(extFor(input), 'html')))

test('mimeFor', () => [
	'file.html',
	'file.HTmL'
].map(input =>
	equal(mimeFor(input), 'text/html')))
