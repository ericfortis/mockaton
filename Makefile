export NODE_ENV = development

start:
	@node --watch-path=src/server src/server/cli.js


docker: docker-build docker-run

docker-build:
	@docker build --no-cache --tag mockaton $(PWD)

docker-run: docker-stop
	@docker run --name mockaton \
		--publish 127.0.0.1:2020:2020 \
		--volume $(PWD)/mockaton.config.js:/app/mockaton.config.js \
    --volume $(PWD)/mockaton-mocks:/app/mockaton-mocks \
    --volume $(PWD)/mockaton-static-mocks:/app/mockaton-static-mocks \
		mockaton

docker-stop:
	@docker stop mockaton >/dev/null 2>&1 || true
	@docker rm mockaton >/dev/null 2>&1 || true
	


TEST_CMD = MOCKATON_WATCHER_DEBOUNCE_MS=0 \
	node --test 'src/**/*.test.js'

test:
	$(TEST_CMD)

test-docker:
	@docker run --rm --interactive --tty \
		--env NODE_ENV=$$NODE_ENV \
		--volume $(PWD):/app \
		--workdir /app \
		node:24-slim \
		sh -c "$(TEST_CMD)"

coverage:
	@MOCKATON_WATCHER_DEBOUNCE_MS=0 node \
		--test --experimental-test-coverage \
		--test-reporter=spec --test-reporter-destination=stdout \
		--test-reporter=lcov --test-reporter-destination=lcov.info \
		'src/server/**/*.test.js'


pixaton:
	cd pixaton-tests && npm t

.PHONY: *
