all: build-demo run-demo

build-demo:
	docker build -t mockaton .

run-demo: down
	docker run --name mockaton -p 127.0.0.1:4040:4040 mockaton

down:
	@docker stop mockaton >/dev/null 2>&1 || true
	@docker rm mockaton >/dev/null 2>&1 || true
	
.PHONY: *
