# define a recursive wildcard function, we'll need it to find deeply nested
# sources in the ui directory
# based on http://blog.jgc.org/2011/07/gnu-make-recursive-wildcard-function.html
rwildcard = $(foreach d, $(wildcard $1*), $(call rwildcard,$d/,$2) $(filter $(subst *,%,$2),$d))

NODE_PATH    := $(shell npm root)/.bin
NODE_MODULES := $(shell npm root)
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

build/index.html: $(NODE_INSTALL) $(NODE_PATH)/react-scripts $(call rwildcard, public src, *) purgecss.config.js restore-css
	@rm -fr node_modules/.cache/eslint-loader
	cat node_modules/bootstrap/scss/_root.scss | sed s/':root {'/'* {'/ > src/Styles/BootstrapRoot.scss
	npm run build

.PHONY: build
build: build/index.html

.PHONY: test-js
test-js: $(NODE_PATH)/react-scripts $(NODE_PATH)/jest
	CI=true NODE_OPTIONS="--unhandled-rejections=strict" npm test -- --coverage

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
	env NODE_OPTIONS=--no-experimental-fetch npx source-map-explorer build/static/*/*.{js,css} --json > build/stats.json

.PHONY: backup-css
backup-css:
	mkdir -p build/static/css build.pre/static
	rm -fr build.pre/static/*
	cp -R build/static/css build.pre/static/css

.PHONY: restore-css
restore-css:
	@(test -d build/static/css && test -d build.pre/static/css && rm -fr build/static/css && cp -R build.pre/static/css build/static/css) || echo

build.pre/css.diff: build purgecss.config.js
	npx prettier -w build.pre/static/css/*.css build/static/css/*.css
	diff -uNr build.pre/static/css build/static/css > build.pre/css.diff || echo

.PHONY: npm-upgrade
npm-upgrade:
	rm -fr node_modules package-lock.json
	npm install
