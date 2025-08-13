#!/usr/bin/env node

import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { Mockaton, jwtCookie } from 'mockaton'


const { port } = parseArgs({
	options: { port: { type: 'string' } }
}).values

Mockaton({
	port: Number(port) || 2345,
	mocksDir: join(import.meta.dirname, './mocks'),
	cookies: {
		'Non-Admin User': jwtCookie('id_token', {
			name: 'John Doe',
			roles: ['USER']
		}),
		'Admin User': jwtCookie('id_token', {
			name: 'Charlie Root',
			roles: ['ADMIN']
		})
	}
})
