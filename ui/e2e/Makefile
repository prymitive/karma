NODE_PATH    := $(shell npm bin)
NODE_MODULES := $(shell dirname `npm bin`)
NODE_INSTALL := $(NODE_MODULES)/.install

PATH         := $(PATH):$(NODE_PATH)
SHELL        := env PATH=$(PATH) /bin/sh

$(NODE_INSTALL): package.json package-lock.json
	@if [ -e $(NODE_INSTALL) ]; then npm install ; else npm ci; fi
	touch $@

$(NODE_PATH)/%: $(NODE_INSTALL)
	@if [ ! -x $@ ]; then echo "missing script: $@" ; exit 1; fi

.PHONY: test
test: $(NODE_PATH)/jest
	CI=true npm run test
