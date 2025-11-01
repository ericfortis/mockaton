start:
	@node src/cli.js

watch:
	@node --watch src/cli.js


test:
	@MOCKATON_WATCHER_DEBOUNCE_MS=0 node --test 'src/**/*.test.js'

test-docker:
	@docker run --rm --interactive --tty \
		--volume .:/app \
		--workdir /app \
		node:24 \
		make test

coverage:
	@MOCKATON_WATCHER_DEBOUNCE_MS=0 node --test --experimental-test-coverage \
		--test-reporter=spec --test-reporter-destination=stdout \
		--test-reporter=lcov --test-reporter-destination=lcov.info \
		'src/**/*.test.js'

pixaton:
	@node --test --experimental-test-isolation=none \
		--import=./pixaton-tests/_setup.js \
		'pixaton-tests/**/*.test.js'

outdated:
	@npm outdated --parseable |\
		awk -F: '{ printf "npm i %-30s ;# %s\n", $$4, $$2 }'

.PHONY: *
