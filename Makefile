.PHONY: *

docker: docker-build docker-run

docker-build:
	@tar cf - Dockerfile | docker build --no-cache --tag mockaton -

docker-run: docker-stop
	@docker run -it --rm --name mockaton \
		--publish 127.0.0.1:2020:2020 \
		--volume $(PWD)/mockaton.config.js:/app/mockaton.config.js \
    --volume $(PWD)/mockaton-mocks:/app/mockaton-mocks \
    --volume $(PWD)/mockaton-static-mocks:/app/mockaton-static-mocks \
		mockaton

docker-stop:
	@docker stop mockaton >/dev/null 2>&1 || true
	@docker rm mockaton >/dev/null 2>&1 || true
	
# End of Docker for End-Users



#
# Dev Stuff
#

start:
	@node --watch-path=src/server src/server/cli.js

test:
	@node --test 'src/**/*.test.js'

test-docker:
	@docker run --rm --interactive --tty \
		--volume $(PWD):/app \
		--workdir /app \
		node:24-alpine \
		node --test 'src/**/*.test.js'

coverage:
	@node --test --experimental-test-coverage \
		--test-reporter=spec --test-reporter-destination=stdout \
		--test-reporter=lcov --test-reporter-destination=lcov.info \
		'src/server/**/*.test.js'


pixaton:
	cd pixaton-tests && npm t

