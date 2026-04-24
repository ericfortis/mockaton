#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { mkdir, writeFile, readFile } from 'node:fs/promises'


const INPUT = rel('README.md')
const SKILLS_OUTPUT_PATH = rel('skills/mockaton/SKILL.md')
const WWW_SKILLS_OUTPUT_PATH = rel('www/src/.well-known/agent-skills/mockaton/SKILL.md')
const WWW_INDEX_OUTPUT_PATH = rel('www/src/.well-known/agent-skills/index.json')


const skillData = `
---
name: Mockaton
description: Generates and serves mock HTTP APIs. Use when creating, editing, or reasoning about mock endpoints.
user-invocable: false
---
${excludeSkillIgnoredRegions(await readFile(INPUT, 'utf8'))}
`.trim()


const indexData = JSON.stringify({
	'$schema': 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
	skills: [
		{
			url: '/.well-known/agent-skills/mockaton/SKILL.md',
			name: 'mockaton',
			type: 'skill-md',
			description: 'Generates and serves HTTP API mocks',
			digest: 'sha256:' + createHash('sha256').update(skillData).digest('hex')
		}
	]
}, null, '  ')


await write(SKILLS_OUTPUT_PATH, skillData)
await write(WWW_SKILLS_OUTPUT_PATH, skillData)
await write(WWW_INDEX_OUTPUT_PATH, indexData)


function excludeSkillIgnoredRegions(text) {
	const BEGIN = '<!-- SKILLS_IGNORE_BEGIN -->'
	const END = '<!-- SKILLS_IGNORE_END -->'
	let result = ''
	let i = 0
	while (i < text.length) {
		const start = text.indexOf(BEGIN, i)
		if (start === -1) {
			result += text.slice(i)
			break
		}

		result += text.slice(i, start)
		const end = text.indexOf(END, BEGIN.length + start)
		if (end === -1)
			break
		i = END.length + end
	}
	return result.trim()
}

function rel(...f) {
	return join(import.meta.dirname, ...f)
}

export async function write(path, body) {
	await mkdir(dirname(path), { recursive: true })
	await writeFile(path, body)
}
