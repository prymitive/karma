# define a recursive wildcard function, we'll need it to find deeply nested
# sources in the ui directory
# based on http://blog.jgc.org/2011/07/gnu-make-recursive-wildcard-function.html
rwildcard = $(foreach d, $(wildcard $1*), $(call rwildcard,$d/,$2) $(filter $(subst *,%,$2),$d))

NODE_PATH    := $(shell npm bin)
NODE_MODULES := $(shell dirname `npm bin`)
NODE_INSTALL := $(NODE_MODULES)/.install

PATH         := $(PATH):$(NODE_PATH)
SHELL        := env PATH=$(PATH) /bin/sh

.DEFAULT_GOAL := build/index.html

$(NODE_INSTALL): package.json package-lock.json
	@if [ -e $(NODE_INSTALL) ]; then npm install ; else npm ci; fi
	touch $@

.PHONY: npm-fetch
npm-fetch: $(NODE_INSTALL)

$(NODE_PATH)/%: $(NODE_INSTALL)
	@if [ ! -x $@ ]; then echo "missing script: $@" ; exit 1; fi

build/index.html: $(NODE_INSTALL) $(NODE_PATH)/react-scripts $(call rwildcard, public src, *)
	@rm -fr node_modules/.cache/eslint-loader
	npm run build

.PHONY: build
build: build/index.html

.PHONY: test-js
test-js: $(NODE_PATH)/react-scripts $(NODE_PATH)/jest
	CI=true NODE_OPTIONS="--unhandled-rejections=strict" npm test -- --coverage

.PHONY: test-percy
test-percy: $(NODE_PATH)/react-scripts $(NODE_PATH)/build-storybook $(NODE_PATH)/percy-storybook
	CI=true npm run snapshot

.PHONY: lint-js
lint-js: $(NODE_PATH)/eslint
	@rm -fr node_modules/.cache/eslint-loader
	eslint --ext .js,.jsx,.ts,.tsx src
	tsc --noEmit -p .

.PHONY: lint-typescript
lint-typescript:
	@$(eval JSFILES := $(shell find $(CURDIR)/src \( -iname \*.js -o -iname \*.jsx \) -not -name setupTests.js ))
	@if [ "$(JSFILES)" != "" ]; then echo "$(JSFILES)" | tr " " "\n"; exit 1 ; fi

.PHONY: format
format: $(NODE_PATH)/prettier
	prettier --write 'src/**/*.ts' 'src/**/*.tsx'

build/stats.json: build
	npx source-map-explorer build/static/*/*.{js,css} --json > build/stats.json

.PHONY: npm-upgrade
npm-upgrade:
	rm -fr node_modules package-lock.json
	npm install
