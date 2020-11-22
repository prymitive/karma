.PHONY: lint-bootstrap-version
lint-bootstrap-version:
	$(eval BOOTSTRAP_VERSION := $(shell grep bootstrap ui/package.json | cut -d: -f2 | tr -d ' ",'))
	$(eval BOOTSWATCH_VERSION := $(shell grep bootswatch ui/package.json | cut -d: -f2 | tr -d ' ",'))
	@if [ "$(BOOTSTRAP_VERSION)" != "$(BOOTSWATCH_VERSION)" ]; then \
		echo "Bootstrap version mismatch: BOOTSTRAP_VERSION=$(BOOTSTRAP_VERSION) BOOTSWATCH_VERSION=$(BOOTSWATCH_VERSION)"; \
		exit 1; \
	fi
