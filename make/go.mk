include make/vars.mk

ENV    := GO111MODULE=on
GO     := $(ENV) go
GOBIN := $(shell go env GOBIN)
ifeq ($(GOBIN),)
GOBIN = $(shell go env GOPATH)/bin
endif

ui/build/index.html: $(call rwildcard, ui/src ui/package.json ui/package-lock.json, *)
	@$(MAKE) -C ui build

$(GOBIN)/go-bindata: go.mod go.sum
	$(GO) install github.com/go-bindata/go-bindata/...
$(GOBIN)/go-bindata-assetfs: $(GOBIN)/go-bindata go.mod go.sum
	$(GO) install github.com/elazarl/go-bindata-assetfs/...
cmd/karma/bindata_assetfs.go: $(GOBIN)/go-bindata-assetfs $(SOURCES_JS) ui/build/index.html
	go-bindata-assetfs -o cmd/karma/bindata_assetfs.go ui/build/... ui/src/... cmd/karma/tests/bindata/...

.DEFAULT_GOAL := $(NAME)
$(NAME): go.mod go.sum cmd/karma/bindata_assetfs.go $(SOURCES_GO)
	$(GO) build -ldflags "-X main.version=$(VERSION)" ./cmd/karma

$(GOBIN)/gocovmerge: go.mod go.sum
	$(GO) install github.com/hansboder/gocovmerge
.PHONY: test-go
test-go: $(GOBIN)/gocovmerge
	@rm -f profile.*
	$(ENV) ./scripts/test-unit.sh
	$(ENV) ./scripts/test-main.sh
	$(ENV) ./scripts/gocovmerge.sh

.PHONY: benchmark-go
benchmark-go:
	$(GO) test -run=NONE -bench=. -benchmem ./...

$(GOBIN)/golangci-lint: go.mod go.sum
	$(GO) install github.com/golangci/golangci-lint/cmd/golangci-lint
.PHONY: lint-go
lint-go: $(GOBIN)/golangci-lint
	$(ENV) golangci-lint run -v

.PHONY: format-go
format-go:
	gofmt -l -s -w .

.PHONY: download-deps-go
download-deps-go:
	$(GO) mod download

.PHONY: install-deps-build-go
install-deps-build-go: $(GOBIN)/go-bindata-assetfs

.PHONY: openapi-client
openapi-client:
	for f in $(wildcard internal/mapper/*/Dockerfile) ; do $(MAKE) -C `dirname "$$f"` ; done

# Creates mock bindata_assetfs.go with source assets
.PHONY: mock-assets
mock-assets: $(GOBIN)/go-bindata-assetfs
	rm -fr ui/build
	mkdir ui/build
	cp ui/public/* ui/build/
	go-bindata-assetfs -o cmd/karma/bindata_assetfs.go -nometadata ui/build/... cmd/karma/tests/bindata/...
	rm -fr ui/build
