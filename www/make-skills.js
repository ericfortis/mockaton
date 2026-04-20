#!/usr/bin/env node

import { join } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'

const rel = f => join(import.meta.dirname, f)
const INPUT = rel('../README.md')
const OUTPUT = rel('./src/assets/SKILLS.md')

writeFileSync(OUTPUT, `
---
name: Mockaton
description: Generates and serves mock HTTP APIs from filesystem conventions. Use when creating, editing, or reasoning about mock endpoints.
---

${extractSkillContent(readFileSync(INPUT, 'utf8'))}
`.trim())


function extractSkillContent(text) {
	const markerIgnoreBegin = '<!-- SKILLS_IGNORE_BEGIN -->'
	const markerIgnoreEnd = '<!-- SKILLS_IGNORE_END -->'
	let result = ''
	let index = 0
	while (index < text.length) {
		const start = text.indexOf(markerIgnoreBegin, index)
		if (start === -1) {
			result += text.slice(index)
			break
		}

		result += text.slice(index, start)
		const end = text.indexOf(markerIgnoreEnd, start + markerIgnoreBegin.length)
		if (end === -1)
			break
		index = end + markerIgnoreEnd.length
	}
	return result.trim()
}
