#!/usr/bin/env node

import { parseArgs } from 'node:util'
import { Mockaton } from 'mockaton'
import mockatonConfig from './mockaton-config.js'


const { port } = parseArgs({
	options: {
		port: { type: 'string', default: '2345' }
	}
}).values

Mockaton({
	port: Number(port),
	...mockatonConfig
})
