include make/vars.mk

GOBIN := $(shell go env GOBIN)
ifeq ($(GOBIN),)
GOBIN = $(shell go env GOPATH)/bin
endif

ui/build/index.html: $(call rwildcard, ui/src ui/package.json ui/package-lock.json, *)
	@$(MAKE) -C ui build

.DEFAULT_GOAL := $(NAME)
$(NAME): go.mod go.sum $(SOURCES_GO) ui/build/index.html
	go build -trimpath -modcacherw -ldflags "-X main.version=$(VERSION) -s -w" ./cmd/karma

.PHONY: test-go
test-go:
	@rm -f profile.*
	$(ENV) ./scripts/test-unit.sh
	$(ENV) ./scripts/test-main.sh
	$(ENV) ./scripts/gocovmerge.sh

GOBENCHMARKCOUNT := 10
.PHONY: benchmark-go
benchmark-go:
	@env GOMAXPROCS=2 go test -count=$(GOBENCHMARKCOUNT) -run=NONE -bench=. -benchmem ./...

$(GOBIN)/benchstat: tools/benchstat/go.mod tools/benchstat/go.sum
	@go install -modfile=tools/benchstat/go.mod golang.org/x/perf/cmd/benchstat
benchmark-compare-go: $(GOBIN)/benchstat
	@$(GOBIN)/benchstat main.txt new.txt

$(GOBIN)/looppointer: tools/looppointer/go.mod tools/looppointer/go.sum
	go install -modfile=tools/looppointer/go.mod github.com/kyoh86/looppointer/cmd/looppointer
.PHONY: lint-go-looppointer
lint-go-looppointer: $(GOBIN)/looppointer
	$(ENV) looppointer -c 2 ./...

$(GOBIN)/golangci-lint: tools/golangci-lint/go.mod tools/golangci-lint/go.sum
	go install -modfile=tools/golangci-lint/go.mod github.com/golangci/golangci-lint/cmd/golangci-lint
.PHONY: lint-go
lint-go: $(GOBIN)/golangci-lint lint-go-looppointer
	$(ENV) golangci-lint run -v

$(GOBIN)/lint-go-goimports: tools/goimports/go.mod tools/goimports/go.sum
	go install -modfile=tools/goimports/go.mod golang.org/x/tools/cmd/goimports
.PHONY: format-go
format-go: $(GOBIN)/lint-go-goimports
	gofmt -l -s -w .
	goimports -local github.com/prymitive/karma -w .

.PHONY: download-deps-go
download-deps-go:
	@for f in $(wildcard tools/*/go.mod) ; do echo ">>> $$f" && cd $(CURDIR)/`dirname "$$f"` && go mod download && cd $(CURDIR) ; done
	go mod download

.PHONY: openapi-client
openapi-client:
	for f in $(wildcard internal/mapper/*/Dockerfile) ; do $(MAKE) -C `dirname "$$f"` ; done

.PHONY: mock-assets
mock-assets:
	rm -fr ui/build
	mkdir ui/build
	cp ui/public/* ui/build/
	mkdir ui/build/static
	touch ui/build/static/main.js

.PHONY: tools-go-mod-tidy
tools-go-mod-tidy:
	@for f in $(wildcard tools/*/go.mod) ; do echo ">>> $$f" && cd $(CURDIR)/`dirname "$$f"` && go mod tidy && cd $(CURDIR) ; done
