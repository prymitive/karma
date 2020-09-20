# define a recursive wildcard function, we'll need it to find deeply nested
# sources in the ui directory
# based on http://blog.jgc.org/2011/07/gnu-make-recursive-wildcard-function.html
rwildcard = $(foreach d, $(wildcard $1*), $(call rwildcard,$d/,$2) $(filter $(subst *,%,$2),$d))

NODE_PATH := $(shell npm bin)
PATH      := $(PATH):$(NODE_PATH)
SHELL     := env PATH=$(PATH) /bin/sh

$(NODE_PATH)/%: package.json package-lock.json
	@export D="$*"; \
		if [ "$*" = "commitlint-travis" ]; then export D="@commitlint/travis-cli" ; fi; \
		if [ "$*" = "build-storybook" ]; then export D="@storybook/react" ; fi; \
		if [ "$*" = "percy-storybook" ]; then export D="@percy-io/percy-storybook" ; fi; \
		if [ -d "$(CURDIR)/node_modules/$$D" ] && [ ! -x "$@" ]; then (echo "resetting node_modules" && npm ci); else npm install ; fi
	@if [ -x $@ ]; then touch -c $@ ; else echo "missing script: $@" ; exit 1; fi

build/index.html: $(NODE_PATH)/react-scripts $(call rwildcard, public src, *)
	@rm -fr node_modules/.cache/eslint-loader
	npm run build

.PHONY: build
build: build/index.html

.PHONY: test-js
test-js: $(NODE_PATH)/react-scripts $(NODE_PATH)/jest
	CI=true NODE_OPTIONS="--unhandled-rejections=strict" npm test -- --coverage

.PHONY: test-demo
test-demo: $(NODE_PATH)/react-scripts $(NODE_PATH)/jest
	CI=true jest --runInBand e2e/demo.test.js

.PHONY: test-percy
test-percy: $(NODE_PATH)/react-scripts $(NODE_PATH)/build-storybook $(NODE_PATH)/percy-storybook
	CI=true npm run snapshot

.PHONY: lint-js
lint-js: $(NODE_PATH)/eslint
	@rm -fr node_modules/.cache/eslint-loader
	eslint --ext .js,.jsx,.ts,.tsx src

.PHONY: lint-git-ci
lint-git-ci: $(NODE_PATH)/commitlint-travis
	commitlint-travis

.PHONY: lint-docs
lint-docs: $(NODE_PATH)/markdownlint
	markdownlint ../*.md ../docs

.PHONY: lint-deps
lint-deps: $(NODE_PATH)/depcheck
	depcheck $(CURDIR)

.PHONY: lint-typescript
lint-typescript:
	@$(eval JSFILES := $(shell find $(CURDIR)/src \( -iname \*.js -o -iname \*.jsx \) -not -name setupTests.js ))
	@if [ "$(JSFILES)" != "" ]; then echo "$(JSFILES)" | tr " " "\n"; exit 1 ; fi

.PHONY: format
format: $(NODE_PATH)/prettier
	prettier --write 'src/**/*.ts' 'src/**/*.tsx'

build/stats.json: build
	source-map-explorer build/static/*/*.{js,css} --json > build/stats.json
