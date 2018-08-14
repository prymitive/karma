NAME    := unsee
VERSION := $(shell git describe --tags --always --dirty='-dev')

# Alertmanager instance used when running locally, points to mock data
MOCK_PATH         := $(CURDIR)/internal/mock/0.15.2
ALERTMANAGER_URI := "file://$(MOCK_PATH)"
# Listen port when running locally
PORT := 8080

# define a recursive wildcard function, we'll need it to find deeply nested
# sources in the ui directory
# based on http://blog.jgc.org/2011/07/gnu-make-recursive-wildcard-function.html
rwildcard = $(foreach d, $(wildcard $1*), $(call rwildcard,$d/,$2) $(filter $(subst *,%,$2),$d))

SOURCES       := $(wildcard *.go) $(wildcard */*.go) $(wildcard */*/*.go)
ASSET_SOURCES := $(call rwildcard, ui/public ui/src, *)

GO_BINDATA_MODE := prod
ifdef DEBUG
	GO_BINDATA_MODE  = debug
endif

.DEFAULT_GOAL := $(NAME)

.build/deps-build-go.ok:
	@mkdir -p .build
	go get -u github.com/golang/dep/cmd/dep
	go get -u github.com/jteeuwen/go-bindata/...
	go get -u github.com/elazarl/go-bindata-assetfs/...
	touch $@

.build/deps-lint-go.ok:
	@mkdir -p .build
	go get -u github.com/golangci/golangci-lint/cmd/golangci-lint
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
	cd ui && npm run-script build-css
	cd ui && npm run build
	touch $@

bindata_assetfs.go: .build/deps-build-go.ok .build/artifacts-bindata_assetfs.$(GO_BINDATA_MODE) .build/vendor.ok .build/artifacts-ui.ok
	go-bindata-assetfs -o bindata_assetfs.go -nometadata ui/build/...

$(NAME): .build/deps-build-go.ok .build/vendor.ok bindata_assetfs.go $(SOURCES)
	go build -ldflags "-X main.version=$(VERSION)"

.build/vendor.ok: .build/deps-build-go.ok Gopkg.lock Gopkg.toml
	dep ensure
	touch $@

.PHONY: vendor
vendor: .build/deps-build-go.ok
	dep ensure

.PHONY: vendor-update
vendor-update: .build/deps-build-go.ok
	dep ensure -update

.PHONY: clean
clean:
	rm -fr .build bindata_assetfs.go $(NAME) ui/build ui/node_modules

.PHONY: run
run: $(NAME)
	ALERTMANAGER_INTERVAL=36000h \
	ALERTMANAGER_URI=$(ALERTMANAGER_URI) \
	LABELS_COLOR_UNIQUE="@receiver instance cluster" \
	LABELS_COLOR_STATIC="job" \
	FILTERS_DEFAULT="@state=active @receiver=by-cluster-service" \
	PORT=$(PORT) \
	./$(NAME)

.PHONY: docker-image
docker-image:
	docker build --build-arg VERSION=$(VERSION) -t $(NAME):$(VERSION) .

.PHONY: run-docker
run-docker: docker-image
	@docker rm -f $(NAME) || true
	docker run \
		--name $(NAME) \
		-v $(MOCK_PATH):$(MOCK_PATH) \
		-e ALERTMANAGER_INTERVAL=36000h \
		-e ALERTMANAGER_URI=$(ALERTMANAGER_URI) \
		-e LABELS_COLOR_UNIQUE="instance cluster" \
		-e LABELS_COLOR_STATIC="job" \
		-e FILTERS_DEFAULT="@state=active @receiver=by-cluster-service" \
		-e PORT=$(PORT) \
		-p $(PORT):$(PORT) \
		$(NAME):$(VERSION)

.PHONY: lint-go
lint-go: .build/deps-lint-go.ok
	golangci-lint run

.PHONY: lint-js
lint-js: .build/deps-build-node.ok
	cd ui && ./node_modules/.bin/eslint --quiet src

.PHONY: lint-docs
lint-docs: .build/deps-build-node.ok
	$(CURDIR)/ui/node_modules/.bin/markdownlint *.md docs

.PHONY: lint
lint: lint-go lint-js lint-docs

.PHONY: test-go
test-go: .build/vendor.ok
	go test -v -bench=. -benchmem -cover `go list ./... | grep -v /vendor/`

.PHONY: test-js
test-js: .build/deps-build-node.ok
	cd ui && CI=true npm test -- --coverage

.PHONY: test
test: lint test-go test-js

.PHONY: show-version
show-version:
	@echo $(VERSION)

# Creates mock bindata_assetfs.go with source assets
.PHONY: mock-assets
mock-assets: .build/deps-build-go.ok
	rm -fr ui/build
	mkdir ui/build
	cp ui/public/* ui/build/
	go-bindata-assetfs -o bindata_assetfs.go -nometadata ui/build/...
	# force assets rebuild on next make run
	rm -f .build/bindata_assetfs.*

.PHONY: ui
ui: .build/artifacts-ui.ok

.PHONY: greenkeeper-lockfile
greenkeeper-lockfile:
	npm install -g greenkeeper-lockfile@2
	cd ui && greenkeeper-lockfile-update
	cd ui && greenkeeper-lockfile-upload
