import { test } from 'node:test'
import { equal } from 'node:assert/strict'
import { parseMime, extFor, mimeFor } from './mime.js'


test('parseMime', () => [
	'text/html',
	'TEXT/html',
	'text/html; charset=utf-8'
].map(input =>
	equal(parseMime(input), 'text/html')))

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
