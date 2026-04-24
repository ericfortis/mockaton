#!/usr/bin/env -S node

import { Packaton } from 'packaton'


switch (process.argv[2]) {
	case 'development':
		Packaton({ port: 3349 })
		break

	case 'production':
		Packaton({
			mode: 'production',
			sitemapDomain: 'mockaton.com',
			routeHeaders: [
				['Cache-Control', 'public,max-age=60'],
			]
		})
		break

	default:
		console.error('Error')
}
