include make/vars.mk
include make/go.mk
include make/cc.mk
include make/docker.mk
include make/lint-versions.mk

.PHONY: lint
lint: lint-versions
	make -C ui lint-js
	make -C ui lint-docs

.PHONY: test
test: lint
	make test-go
	make -C ui test-js

.PHONY: clean
clean:
	rm -fr cmd/karma/bindata_assetfs.go $(NAME) $(NAME)-* ui/build ui/node_modules coverage.txt

.PHONY: show-version
show-version:
	@echo $(VERSION)
