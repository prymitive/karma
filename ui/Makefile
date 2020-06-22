# define a recursive wildcard function, we'll need it to find deeply nested
# sources in the ui directory
# based on http://blog.jgc.org/2011/07/gnu-make-recursive-wildcard-function.html
rwildcard = $(foreach d, $(wildcard $1*), $(call rwildcard,$d/,$2) $(filter $(subst *,%,$2),$d))

node_modules/%: package.json package-lock.json
	npm install
	touch $@

build/index.html: node_modules/react-scripts/bin/react-scripts.js $(call rwildcard, public src, *)
	npm run build

.PHONY: build
build: build/index.html

.PHONY: test-js
test-js: node_modules/jest/bin/jest.js
	CI=true NODE_OPTIONS="--unhandled-rejections=strict" npm test -- --coverage

.PHONY: test-demo
test-demo: node_modules/jest/bin/jest.js
	CI=true ./node_modules/.bin/jest --runInBand e2e/demo.test.js

.PHONY: test-percy
test-percy: node_modules/@storybook/react/bin/build.js
	CI=true npm run snapshot

.PHONY: lint-js
lint-js: node_modules/eslint/bin/eslint.js
	node_modules/eslint/bin/eslint.js --quiet src

.PHONY: lint-git-ci
lint-git-ci: node_modules/@commitlint/travis-cli/lib/cli.js
	node_modules/@commitlint/travis-cli/lib/cli.js

.PHONY: lint-docs
lint-docs: node_modules/markdownlint-cli/markdownlint.js
	node_modules/markdownlint-cli/markdownlint.js ../*.md ../docs

.PHONY: format
format: node_modules/prettier/bin-prettier.js
	node_modules/prettier/bin-prettier.js --write 'src/**/*.js' 'src/**/*.ts' 'src/**/*.tsx'

build/stats.json: build
	node_modules/source-map-explorer/dist/cli.js build/static/*/*.{js,css} --json > build/stats.json
