include make/vars.mk

.PHONY: docker-image
docker-image:
	docker build --build-arg VERSION=$(VERSION) -t $(NAME):latest .

.PHONY: run-demo
run-demo:
	docker build --build-arg VERSION=$(VERSION) -t $(NAME):demo -f demo/Dockerfile .
	@docker rm -f $(NAME)-demo || true
	docker run --rm --name $(NAME)-demo -p 8080:8080 -p 9093:9093 -p 9094:9094 -p 9095:9095 $(NAME):demo
