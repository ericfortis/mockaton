#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { mkdir, writeFile, readFile } from 'node:fs/promises'

const rel = (...f) => join(import.meta.dirname, ...f)
const INPUT = rel('../README.md')
const OUTPUT_URL = '/.well-known/agent-skills/mockaton/SKILLS.md'
const OUTPUT_PATH = rel('src', OUTPUT_URL)
const INDEX_OUTPUT_PATH = rel('src/.well-known/agent-skills/index.json')


const skillData = `
---
name: Mockaton
description: Generates and serves mock HTTP APIs from filesystem conventions. Use when creating, editing, or reasoning about mock endpoints.
---

${extractSkillContent(await readFile(INPUT, 'utf8'))}
`.trim()

await write(OUTPUT_PATH, skillData)
await write(INDEX_OUTPUT_PATH, indexJsonTemplate(skillData))


export async function write(path, body) {
	await mkdir(dirname(path), { recursive: true })
	await writeFile(path, body)
}

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


function indexJsonTemplate(data) {
	return JSON.stringify(
		{
			'$schema': 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
			skills: [
				{
					name: 'mockaton',
					type: 'skill-md',
					description: 'How to handle HTTP API mocks with Mockaton',
					url: OUTPUT_URL,
					digest: 'sha256:' + sha256(data)
				}
			]
		}, null, '  ')
}

function sha256(data) {
	return createHash('sha256').update(data).digest('hex')
}
