all: build-standalone-demo run-standalone-demo

build-standalone-demo:
	docker build -t mockaton .

run-standalone-demo: stop-standalone-demo
	docker run --name mockaton -p 127.0.0.1:4040:4040 mockaton

stop-standalone-demo:
	@docker stop mockaton >/dev/null 2>&1 || true
	@docker rm mockaton >/dev/null 2>&1 || true
	
.PHONY: *
