# define a recursive wildcard function, we'll need it to find deeply nested
# sources in the ui directory
# based on http://blog.jgc.org/2011/07/gnu-make-recursive-wildcard-function.html
rwildcard = $(foreach d, $(wildcard $1*), $(call rwildcard,$d/,$2) $(filter $(subst *,%,$2),$d))

NODE_PATH    := $(shell npm root)/.bin
NODE_MODULES := $(shell npm root)
NODE_INSTALL := $(NODE_MODULES)/.install

PATH         := $(PATH):$(NODE_PATH)
SHELL        := env PATH=$(PATH) /bin/sh

.DEFAULT_GOAL := dist/index.html

$(NODE_INSTALL): package.json package-lock.json
	@if [ -e $(NODE_INSTALL) ]; then npm install ; else npm ci; fi
	touch $@

.PHONY: npm-fetch
npm-fetch: $(NODE_INSTALL)

$(NODE_PATH)/%: $(NODE_INSTALL)
	@if [ ! -x $@ ]; then echo "missing script: $@" ; exit 1; fi

dist/index.html: $(NODE_INSTALL) $(NODE_PATH)/vite $(call rwildcard, public src, *)
	npm run build

.PHONY: build
build: dist/index.html

.PHONY: test
test: $(NODE_PATH)/vite $(NODE_PATH)/jest
	CI=true npm test -- --coverage

.PHONY: e2e
e2e: $(NODE_PATH)/vite $(NODE_PATH)/playwright
	npx playwright install
	npx playwright test

.PHONY: update-snapshots
update-snapshots: $(NODE_PATH)/vite $(NODE_PATH)/jest
	CI=true npm test -- -u

.PHONY: update-e2e
update-e2e:
	npx playwright install
	npx playwright test --update-snapshots

.PHONY: lint
lint: $(NODE_PATH)/eslint $(NODE_PATH)/stylelint
	eslint
	tsc --noEmit -p .
	stylelint 'src/**/*.scss' 'src/**/*.css'

.PHONY: lint-typescript
lint-typescript:
	@$(eval JSFILES := $(shell find $(CURDIR)/src \( -iname \*.js -o -iname \*.jsx \) -not -name setupTests.js ))
	@if [ "$(JSFILES)" != "" ]; then echo "$(JSFILES)" | tr " " "\n"; exit 1 ; fi

.PHONY: format
format: $(NODE_PATH)/prettier
	prettier --write 'src/**/*.ts' 'src/**/*.tsx'

dist/stats.json: build
	npx source-map-explorer dist/assets/*.{js,css} --json > dist/stats.json

.PHONY: npm-upgrade
npm-upgrade:
	rm -fr node_modules package-lock.json
	npm install
	npm install
