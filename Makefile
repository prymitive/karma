NAME    := karma
VERSION ?= $(shell git describe --tags --always --dirty='-dev')

# define a recursive wildcard function, we'll need it to find deeply nested
# sources in the ui directory
# based on http://blog.jgc.org/2011/07/gnu-make-recursive-wildcard-function.html
rwildcard = $(foreach d, $(wildcard $1*), $(call rwildcard,$d/,$2) $(filter $(subst *,%,$2),$d))

SOURCES       := $(call rwildcard, cmd internal, *)
ASSET_SOURCES := $(call rwildcard, ui/public ui/src, *)

GO_BINDATA_MODE := prod
ifdef DEBUG
	GO_BINDATA_MODE  = debug
endif

.DEFAULT_GOAL := $(NAME)

.build/deps-build-go.ok:
	@mkdir -p .build
	GO111MODULE=on go install github.com/go-bindata/go-bindata/...
	GO111MODULE=on go install github.com/elazarl/go-bindata-assetfs/...
	touch $@

.build/deps-lint-go.ok:
	@mkdir -p .build
	GO111MODULE=on go install github.com/golangci/golangci-lint/cmd/golangci-lint
	touch $@

.build/deps-build-node.ok: ui/package.json ui/package-lock.json
	@mkdir -p .build
	cd ui && npm install
	touch $@

.build/artifacts-bindata_assetfs.%:
	@mkdir -p .build
	rm -f .build/artifacts-bindata_assetfs.*
	touch $@

.build/artifacts-ui.ok: .build/deps-build-node.ok $(ASSET_SOURCES)
	@mkdir -p .build
	cd ui && (npm run build || (test -n "$$CI" && rm -fr node_modules && npm install && npm run build))
	touch $@

cmd/karma/bindata_assetfs.go: .build/deps-build-go.ok .build/artifacts-bindata_assetfs.$(GO_BINDATA_MODE) .build/artifacts-ui.ok
	go-bindata-assetfs -o cmd/karma/bindata_assetfs.go ui/build/... ui/src/... cmd/karma/tests/bindata/...

$(NAME): .build/deps-build-go.ok go.mod cmd/karma/bindata_assetfs.go $(SOURCES)
	GO111MODULE=on go build -ldflags "-X main.version=$(VERSION)" ./cmd/karma

.PHONY: download-deps
download-deps:
	GO111MODULE=on go mod download

word-split = $(word $2,$(subst -, ,$1))
cc-%: .build/deps-build-go.ok go.mod cmd/karma/bindata_assetfs.go $(SOURCES)
	$(eval GOOS := $(call word-split,$*,1))
	$(eval GOARCH := $(call word-split,$*,2))
	$(eval GOARM := $(call word-split,$*,3))
	$(eval GOARMBIN := $(patsubst %,v%,$(GOARM)))
	$(eval GOEXT := $(patsubst $(GOOS),,$(patsubst windows,.exe,$(GOOS))))
	$(eval BINARY := "karma-$(GOOS)-$(GOARCH)$(GOARMBIN)$(GOEXT)")
	@awk -v bin=$(BINARY) -v goos=$(GOOS) -v goarch=$(GOARCH) -v goarm=$(GOARM) 'BEGIN { printf "[+] %-25s GOOS=%-10s GOARCH=%-10s GOARM=%1s\n", bin, goos, goarch, goarm }'
	@env CGO_ENABLED=0 GOOS=$(GOOS) GOARCH=$(GOARCH) GOARM=$(GOARM) go build -o $(BINARY) -ldflags="-X main.version=$(shell make show-version)" ./cmd/karma
	@test -f $(BINARY)
	@awk -v bin=$(BINARY) -v size=`du -h $(BINARY) | awk '{print $$1}'` -v type="`file -b $(BINARY)`" 'BEGIN { printf "[-] %-25s SIZE=%-10s TYPE=%s\n", bin, size, type }'

PLATFORMS := cc-darwin-386 cc-darwin-amd64 cc-dragonfly-amd64 cc-freebsd-386 cc-freebsd-amd64 cc-freebsd-arm-5 cc-freebsd-arm-6 cc-freebsd-arm-7 cc-linux-386 cc-linux-amd64 cc-linux-arm-5 cc-linux-arm-6 cc-linux-arm-7 cc-linux-arm64 cc-linux-ppc64 cc-linux-ppc64le cc-linux-mips cc-linux-mipsle cc-linux-mips64 cc-linux-mips64le cc-linux-s390x cc-netbsd-386 cc-netbsd-amd64 cc-netbsd-arm-5 cc-netbsd-arm-6 cc-netbsd-arm-7 cc-openbsd-386 cc-openbsd-amd64 cc-openbsd-arm-5 cc-openbsd-arm-6 cc-openbsd-arm-7 cc-solaris-amd64 cc-windows-386 cc-windows-amd64
crosscompile: $(PLATFORMS)
	@echo

.PHONY: clean
clean:
	rm -fr .build cmd/karma/bindata_assetfs.go $(NAME) $(NAME)-* ui/build ui/node_modules coverage.txt

.PHONY: docker-image
docker-image:
	docker build --build-arg VERSION=$(VERSION) -t $(NAME):$(VERSION) .

.PHONY: run-demo
run-demo:
	docker build --build-arg VERSION=$(VERSION) -t $(NAME):demo -f demo/Dockerfile .
	@docker rm -f $(NAME)-demo || true
	docker run --rm --name $(NAME)-demo -p 8080:8080 -p 9093:9093 -p 9094:9094 $(NAME):demo

.PHONY: lint-git-ci
lint-git-ci: .build/deps-build-node.ok
	ui/node_modules/.bin/commitlint-travis

.PHONY: lint-go
lint-go: .build/deps-lint-go.ok
	GO111MODULE=on golangci-lint run -v

.PHONY: lint-js
lint-js: .build/deps-build-node.ok
	cd ui && ./node_modules/.bin/eslint --quiet src

.PHONY: lint-docs
lint-docs: .build/deps-build-node.ok
	$(CURDIR)/ui/node_modules/.bin/markdownlint *.md docs

.PHONY: lint-golang-version
lint-golang-version:
	$(eval CI_VERSION := $(shell grep -E '^(\ +)go:' .travis.yml | awk '{print $$2}' | tr -d "'\"" | sed -E s_'^([0-9]+\.[0-9]+)$$'_'\1.0'_g))
	$(eval BUILD_VERSION := $(shell grep -E '^FROM golang:' Dockerfile | cut -d : -f 2 | awk '{print $1}' | cut -d '-' -f 1))
	$(eval DEMO_VERSION := $(shell grep -E '^FROM golang:' demo/Dockerfile | cut -d : -f 2 | awk '{print $1}' | cut -d '-' -f 1))
	@if [ "$(CI_VERSION)" != "$(BUILD_VERSION)" ] || [ "$(CI_VERSION)" != "$(DEMO_VERSION)" ] || [ "$(BUILD_VERSION)" != "$(DEMO_VERSION)" ]; then \
		echo "Golang version mismatch: CI_VERSION=$(CI_VERSION) BUILD_VERSION=$(BUILD_VERSION) DEMO_VERSION=$(DEMO_VERSION)"; \
		exit 1; \
	fi

.PHONY: lint-nodejs-version
lint-nodejs-version:
	$(eval CI_VERSION := $(shell cat .nvmrc))
	$(eval BUILD_VERSION := $(shell grep -E '^FROM node:' Dockerfile | cut -d : -f 2 | awk '{print $1}' | cut -d '-' -f 1))
	$(eval DEMO_VERSION := $(shell grep -E '^FROM node:' demo/Dockerfile | cut -d : -f 2 | awk '{print $1}' | cut -d '-' -f 1))
	@if [ "$(CI_VERSION)" != "$(BUILD_VERSION)" ] || [ "$(CI_VERSION)" != "$(DEMO_VERSION)" ] || [ "$(BUILD_VERSION)" != "$(DEMO_VERSION)" ]; then \
		echo "Node version mismatch: CI_VERSION=$(CI_VERSION) BUILD_VERSION=$(BUILD_VERSION) DEMO_VERSION=$(DEMO_VERSION)"; \
		exit 1; \
	fi

.PHONY: lint-versions
lint-versions: lint-golang-version lint-nodejs-version

.PHONY: lint
lint: lint-go lint-js lint-docs lint-versions

.PHONY: benchmark-go
benchmark-go:
	GO111MODULE=on go test -run=NONE -bench=. -benchmem ./...

.PHONY: test-go
test-go:
	GO111MODULE=on scripts/gocover.sh

.PHONY: test-js
test-js: .build/deps-build-node.ok
	cd ui && CI=true npm test -- --coverage

.PHONY: test-percy
test-percy: .build/deps-build-node.ok
	cd ui && CI=true npm run snapshot

.PHONY: test
test: lint test-go test-js

.PHONY: format-go
format-go: .build/deps-build-go.ok
	gofmt -l -s -w .

.PHONY: format-js
format-js: .build/deps-build-node.ok
	cd ui && ./node_modules/.bin/prettier --write 'src/**/*.js' 'src/**/*.tsx'

.PHONY: openapi-client
openapi-client:
	for f in $(wildcard internal/mapper/*/Dockerfile) ; do $(MAKE) -C `dirname "$$f"` ; done

.PHONY: show-version
show-version:
	@echo $(VERSION)

# Creates mock bindata_assetfs.go with source assets
.PHONY: mock-assets
mock-assets: .build/deps-build-go.ok
	rm -fr ui/build
	mkdir ui/build
	cp ui/public/* ui/build/
	go-bindata-assetfs -o cmd/karma/bindata_assetfs.go -nometadata ui/build/... cmd/karma/tests/bindata/...
	# force assets rebuild on next make run
	rm -f .build/bindata_assetfs.*

.PHONY: ui
ui: .build/artifacts-ui.ok
