all: build-standalone-demo run-standalone-demo

build-standalone-demo:
	docker build --tag mockaton-demo .

run-standalone-demo: stop-standalone-demo
	docker run -it --name mockaton-demo -p 127.0.0.1:4040:4040 mockaton-demo

stop-standalone-demo:
	@docker stop mockaton-demo >/dev/null 2>&1 || true
	@docker rm mockaton-demo >/dev/null 2>&1 || true
	
.PHONY: *
