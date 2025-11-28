#!/usr/bin/env -S node

import { copyFileSync } from 'node:fs'
import { Packaton } from 'packaton'


switch (process.argv[2]) {
	case 'development':
		Packaton({ port: 3349 })
		break

	case 'production':
		Packaton({ mode: 'production' })
			.then(() => {
				copyFileSync('src/openapi.json', 'dist/openapi.json')
			})
		break

	default:
		console.error('Error')
}
