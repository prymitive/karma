# define a recursive wildcard function, we'll need it to find deeply nested
# sources in the ui directory
# based on http://blog.jgc.org/2011/07/gnu-make-recursive-wildcard-function.html
rwildcard = $(foreach d, $(wildcard $1*), $(call rwildcard,$d/,$2) $(filter $(subst *,%,$2),$d))

.PHONY: node-bin
node-bin:
	@chmod -v 755 node_modules/.bin/*

node_modules/%: package.json package-lock.json
	npm install
	touch $@

build/index.html: node_modules/.bin/react-scripts $(call rwildcard, public src, *) node-bin
	env PATH="$(PATH):$(CURDIR)/node_modules/.bin" npm run build

.PHONY: build
build: build/index.html

.PHONY: test-js
test-js: node_modules/.bin/react-scripts node_modules/.bin/jest node-bin
	env PATH="$(PATH):$(CURDIR)/node_modules/.bin" CI=true NODE_OPTIONS="--unhandled-rejections=strict" npm test -- --coverage

.PHONY: test-demo
test-demo: node_modules/.bin/jest node-bin
	env PATH="$(PATH):$(CURDIR)/node_modules/.bin" CI=true jest --runInBand e2e/demo.test.js

.PHONY: test-percy
test-percy: node_modules/.bin/react-scripts node_modules/.bin/build-storybook node_modules/.bin/percy-storybook node-bin
	env PATH="$(PATH):$(CURDIR)/node_modules/.bin" CI=true npm run snapshot

.PHONY: lint-js
lint-js: node_modules/.bin/eslint node-bin
	env PATH="$(PATH):$(CURDIR)/node_modules/.bin" eslint --ext .js,.jsx,.ts,.tsx src

.PHONY: lint-git-ci
lint-git-ci: node_modules/.bin/commitlint-travis node-bin
	env PATH="$(PATH):$(CURDIR)/node_modules/.bin" commitlint-travis

.PHONY: lint-docs
lint-docs: node_modules/.bin/markdownlint node-bin
	env PATH="$(PATH):$(CURDIR)/node_modules/.bin" markdownlint ../*.md ../docs

.PHONY: lint-deps
lint-deps: node_modules/.bin/depcheck node-bin
	env PATH="$(PATH):$(CURDIR)/node_modules/.bin" depcheck $(CURDIR)

.PHONY: lint-typescript
lint-typescript:
	@$(eval JSFILES := $(shell find $(CURDIR)/src \( -iname \*.js -o -iname \*.jsx \) -not -name setupTests.js ))
	@if [ "$(JSFILES)" != "" ]; then echo "$(JSFILES)" | tr " " "\n"; exit 1 ; fi

.PHONY: format
format: node_modules/.bin/prettier node-bin
	env PATH="$(PATH):$(CURDIR)/node_modules/.bin" prettier --write 'src/**/*.ts' 'src/**/*.tsx'

build/stats.json: build node_modules/.bin/source-map-explorer node-bin
	env PATH="$(PATH):$(CURDIR)/node_modules/.bin" source-map-explorer build/static/*/*.{js,css} --json > build/stats.json
