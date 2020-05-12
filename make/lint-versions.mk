.PHONY: lint-golang-version
lint-golang-version:
	$(eval CI_VERSION := $(shell grep -E '^(\ +)go:' .travis.yml | awk '{print $$2}' | tr -d "'\"" | sed -E s_'^([0-9]+\.[0-9]+)$$'_'\1.0'_g))
	$(eval BUILD_VERSION := $(shell grep -E '^FROM golang:' Dockerfile | cut -d : -f 2 | awk '{print $1}' | cut -d '-' -f 1))
	$(eval DEMO_VERSION := $(shell grep -E '^FROM golang:' demo/Dockerfile | cut -d : -f 2 | awk '{print $1}' | cut -d '-' -f 1))
	@if [ "$(CI_VERSION)" != "$(BUILD_VERSION)" ] || [ "$(CI_VERSION)" != "$(DEMO_VERSION)" ] || [ "$(BUILD_VERSION)" != "$(DEMO_VERSION)" ]; then \
		echo "Golang version mismatch: CI_VERSION=$(CI_VERSION) BUILD_VERSION=$(BUILD_VERSION) DEMO_VERSION=$(DEMO_VERSION)"; \
		exit 1; \
	fi

.PHONY: lint-nodejs-version
lint-nodejs-version:
	$(eval CI_VERSION := $(shell cat .nvmrc))
	$(eval BUILD_VERSION := $(shell grep -E '^FROM node:' Dockerfile | cut -d : -f 2 | awk '{print $1}' | cut -d '-' -f 1))
	$(eval DEMO_VERSION := $(shell grep -E '^FROM node:' demo/Dockerfile | cut -d : -f 2 | awk '{print $1}' | cut -d '-' -f 1))
	@if [ "$(CI_VERSION)" != "$(BUILD_VERSION)" ] || [ "$(CI_VERSION)" != "$(DEMO_VERSION)" ] || [ "$(BUILD_VERSION)" != "$(DEMO_VERSION)" ]; then \
		echo "Node version mismatch: CI_VERSION=$(CI_VERSION) BUILD_VERSION=$(BUILD_VERSION) DEMO_VERSION=$(DEMO_VERSION)"; \
		exit 1; \
	fi

.PHONY: lint-bootstrap-version
lint-bootstrap-version:
	$(eval BOOTSTRAP_VERSION := $(shell grep bootstrap ui/package.json | cut -d: -f2 | tr -d ' ",'))
	$(eval BOOTSWATCH_VERSION := $(shell grep bootswatch ui/package.json | cut -d: -f2 | tr -d ' ",'))
	@if [ "$(BOOTSTRAP_VERSION)" != "$(BOOTSWATCH_VERSION)" ]; then \
		echo "Bootstrap version mismatch: BOOTSTRAP_VERSION=$(BOOTSTRAP_VERSION) BOOTSWATCH_VERSION=$(BOOTSWATCH_VERSION)"; \
		exit 1; \
	fi

.PHONY: lint-versions
lint-versions: lint-golang-version lint-nodejs-version
