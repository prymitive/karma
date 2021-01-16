include make/vars.mk

ENV   := GO111MODULE=on
GO    := $(ENV) go
GOBIN := $(shell go env GOBIN)
ifeq ($(GOBIN),)
GOBIN = $(shell go env GOPATH)/bin
endif

ui/build/index.html: $(call rwildcard, ui/src ui/package.json ui/package-lock.json, *)
	@$(MAKE) -C ui build

$(GOBIN)/go-bindata: tools/go-bindata/go.mod tools/go-bindata/go.sum
	$(GO) install -modfile=tools/go-bindata/go.mod github.com/go-bindata/go-bindata/...
$(GOBIN)/go-bindata-assetfs: $(GOBIN)/go-bindata tools/go-bindata/go.mod tools/go-bindata/go.sum
	$(GO) install -modfile=tools/go-bindata/go.mod github.com/elazarl/go-bindata-assetfs/...
cmd/karma/bindata_assetfs.go: $(GOBIN)/go-bindata-assetfs $(SOURCES_JS) ui/build/index.html
	env PATH="$(PATH):$(GOBIN)" $(GOBIN)/go-bindata-assetfs -o cmd/karma/bindata_assetfs.go ui/build/... ui/src/... cmd/karma/tests/bindata/...

.DEFAULT_GOAL := $(NAME)
$(NAME): go.mod go.sum cmd/karma/bindata_assetfs.go $(SOURCES_GO)
	$(GO) build -ldflags "-X main.version=$(VERSION)" ./cmd/karma

.PHONY: test-go
test-go:
	@rm -f profile.*
	$(ENV) ./scripts/test-unit.sh
	$(ENV) ./scripts/test-main.sh
	$(ENV) ./scripts/gocovmerge.sh

GOBENCHMARKCOUNT := 10
.PHONY: benchmark-go
benchmark-go:
	@env GOMAXPROCS=2 $(GO) test -count=$(GOBENCHMARKCOUNT) -run=NONE -bench=. -benchmem ./...

$(GOBIN)/benchstat: tools/benchstat/go.mod tools/benchstat/go.sum
	@$(GO) install -modfile=tools/benchstat/go.mod golang.org/x/perf/cmd/benchstat
benchmark-compare-go: $(GOBIN)/benchstat
	@$(GOBIN)/benchstat main.txt new.txt

$(GOBIN)/looppointer: tools/looppointer/go.mod tools/looppointer/go.sum
	$(GO) install -modfile=tools/looppointer/go.mod github.com/kyoh86/looppointer/cmd/looppointer
.PHONY: lint-go-looppointer
lint-go-looppointer: $(GOBIN)/looppointer
	$(ENV) looppointer -c 2 ./...

$(GOBIN)/staticcheck: tools/staticcheck/go.mod tools/staticcheck/go.sum
	$(GO) install -modfile=tools/staticcheck/go.mod honnef.co/go/tools/cmd/staticcheck
.PHONY: lint-go-staticcheck
lint-go-staticcheck: $(GOBIN)/staticcheck
	$(ENV) staticcheck ./...

$(GOBIN)/golangci-lint: tools/golangci-lint/go.mod tools/golangci-lint/go.sum
	$(GO) install -modfile=tools/golangci-lint/go.mod github.com/golangci/golangci-lint/cmd/golangci-lint
.PHONY: lint-go
lint-go: $(GOBIN)/golangci-lint lint-go-looppointer lint-go-staticcheck
	$(ENV) golangci-lint run -v

.PHONY: format-go
format-go:
	gofmt -l -s -w .

.PHONY: download-deps-go
download-deps-go:
	@for f in $(wildcard tools/*/go.mod) ; do echo ">>> $$f" && cd $(CURDIR)/`dirname "$$f"` && $(GO) mod download && cd $(CURDIR) ; done
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
	env PATH="$(PATH):$(GOBIN)" $(GOBIN)/go-bindata-assetfs -o cmd/karma/bindata_assetfs.go -nometadata ui/build/... cmd/karma/tests/bindata/...
	rm -fr ui/build

.PHONY: tools-go-mod-tidy
tools-go-mod-tidy:
	@for f in $(wildcard tools/*/go.mod) ; do echo ">>> $$f" && cd $(CURDIR)/`dirname "$$f"` && go mod tidy && cd $(CURDIR) ; done
