ALERTMANAGER_VERSION := v0.22.0
API_VERSION          := v2
PACKAGE              := v017
TARGET_DIR           := /go/src/github.com/prymitive/karma/internal/mapper/$(PACKAGE)
IMAGE_NAME           := openapi_client_$(PACKAGE)

.PHONY: client
client:
	docker build -t $(IMAGE_NAME) .
	docker run \
		--rm \
		-w $(TARGET_DIR) \
		-v $(shell pwd):$(TARGET_DIR) \
		$(IMAGE_NAME) \
		$(ALERTMANAGER_VERSION) $(API_VERSION) $(TARGET_DIR)

.DEFAULT_GOAL := client
