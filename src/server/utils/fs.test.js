import { join } from 'node:path'
import { equal } from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { after, describe, test } from 'node:test'
import { mkdtempSync, rmSync, realpathSync } from 'node:fs'

import { resolveIn } from './fs.js'

const isNull = v => equal(v, null)

describe('resolveIn', () => {
	const baseDir = mkdtempSync(join(tmpdir(), '_resolveIn'))
	const baseParentDir = join(baseDir, '..')
	after(() => rmSync(baseDir, { recursive: true, force: true }))

	test('null when baseDir does not exist', async () =>
		isNull(await resolveIn(join(baseParentDir, 'missing'), 'file.json')))

	test('null when relative path escapes baseDir', async () =>
		isNull(await resolveIn(baseDir, '../outside.json')))


	const realBaseDir = realpathSync(baseDir)
	const onReal = f => join(realBaseDir, f)

	test('resolves a relative file within baseDir', async () =>
		equal(await resolveIn(baseDir, 'file.json'), onReal('file.json')))

	test('resolves file starting with /', async () =>
		equal(await resolveIn(baseDir, '/file.json'), onReal('file.json')))
})
