ALERTMANAGER_VERSION := 2fa210d0e3c86bea44a38f4131c069752738a6cb
API_VERSION          := v2
PACKAGE              := v016
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
