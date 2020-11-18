.PHONY: find-golang-versions
find-golang-versions:
	@find $(CURDIR) -name Dockerfile -exec grep 'FROM golang' {} \; | cut -d: -f2 | cut -d'-' -f1
	@grep go-version $(CURDIR)/.github/workflows/* | awk '{print $$3}'

.PHONY: lint-golang-version
lint-golang-version:
	$(eval VERSIONS := $(shell make find-golang-versions | sort | uniq))
	$(eval COUNT := $(shell echo "$(VERSIONS)" | wc -w))
	@if [ $(COUNT) -gt 1 ]; then echo "Multiple Go versions: $(VERSIONS)" ; exit 1 ; fi

.PHONY: find-nodejs-versions
find-nodejs-versions:
	@find $(CURDIR) -name Dockerfile -exec grep 'FROM node' {} \; | cut -d: -f2 | cut -d'-' -f1
	@grep node-version $(CURDIR)/.github/workflows/* | awk '{print $$3}'

.PHONY: lint-nodejs-version
lint-nodejs-version:
	$(eval VERSIONS := $(shell make find-nodejs-versions | sort | uniq))
	$(eval COUNT := $(shell echo "$(VERSIONS)" | wc -w))
	@if [ $(COUNT) -gt 1 ]; then echo "Multiple NodeJS versions: $(VERSIONS)" ; exit 1 ; fi

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
