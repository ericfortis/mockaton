import { describe } from 'node:test'
import { equal } from 'node:assert/strict'
import { parseMime, extFor, mimeFor } from './mime.js'


describe('parseMime', () => {
	equal(parseMime('text/html'), 'text/html')
	equal(parseMime('TEXT/html'), 'text/html')
	equal(parseMime('text/html; charset=utf-8'), 'text/html')
})

describe('extFor', () => {
	equal(extFor('text/html'), 'html')
	equal(extFor('Text/html'), 'html')
	equal(extFor('text/Html; charset=UTF-16'), 'html')
})

describe('mimeFor', () => {
	equal(mimeFor('file.html'), 'text/html')
	equal(mimeFor('file.HTmL'), 'text/html')
})
