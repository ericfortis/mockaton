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
	const IGNORE_BEGIN = '<!-- SKILLS_IGNORE_BEGIN -->'
	const IGNORE_END = '<!-- SKILLS_IGNORE_END -->'
	let result = ''
	let i = 0
	while (i < text.length) {
		const start = text.indexOf(IGNORE_BEGIN, i)
		if (start === -1) {
			result += text.slice(i)
			break
		}

		result += text.slice(i, start)
		const end = text.indexOf(IGNORE_END, IGNORE_BEGIN.length + start)
		if (end === -1)
			break
		i = IGNORE_END.length + end
	}
	return result.trim()
}
