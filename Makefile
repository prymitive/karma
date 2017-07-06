NAME    := unsee
VERSION := $(shell git describe --tags --always --dirty='-dev')

# Alertmanager instance used when running locally, points to mock data
MOCK_PATH         := $(CURDIR)/mock/0.7.1
ALERTMANAGER_URIS := "mock:file://$(MOCK_PATH)"
# Listen port when running locally
PORT := 8080

SOURCES       := $(wildcard *.go) $(wildcard */*.go) $(wildcard */*/*.go)
ASSET_SOURCES := $(wildcard assets/*/* assets/*/*/*)

GO_BINDATA_MODE := prod
GIN_DEBUG := false
ifdef DEBUG
	GO_BINDATA_FLAGS = -debug
	GO_BINDATA_MODE  = debug
	GIN_DEBUG = true
	DOCKER_ARGS = -v $(CURDIR)/assets:$(CURDIR)/assets:ro
endif

# detect if jshint and/or eslint is installed
JSHINT := $(shell which jshint)
ESLINT := $(shell which eslint)

.DEFAULT_GOAL := $(NAME)

.build/deps.ok:
	go get -u github.com/jteeuwen/go-bindata/...
	go get -u github.com/elazarl/go-bindata-assetfs/...
	go get -u github.com/golang/lint/golint
	mkdir -p .build
	touch $@

.build/bindata_assetfs.%:
	mkdir -p .build
	rm -f .build/bindata_assetfs.*
	touch $@

bindata_assetfs.go: .build/deps.ok .build/bindata_assetfs.$(GO_BINDATA_MODE) $(ASSET_SOURCES)
	go-bindata-assetfs $(GO_BINDATA_FLAGS) -prefix assets -nometadata assets/templates/... assets/static/...

$(NAME): .build/deps.ok bindata_assetfs.go $(SOURCES)
	go build -ldflags "-X main.version=$(VERSION)"

.PHONY: clean
clean:
	rm -fr .build $(NAME)

.PHONY: run
run: $(NAME)
	ALERTMANAGER_URIS=$(ALERTMANAGER_URIS) \
	COLOR_LABELS_UNIQUE="@receiver instance cluster" \
	COLOR_LABELS_STATIC="job" \
	DEBUG="$(GIN_DEBUG)" \
	FILTER_DEFAULT="@state=active" \
	PORT=$(PORT) \
	./$(NAME)

.PHONY: docker-image
docker-image: bindata_assetfs.go
	docker build --build-arg VERSION=$(VERSION) -t $(NAME):$(VERSION) .

.PHONY: run-docker
run-docker: docker-image
	@docker rm -f $(NAME) || true
	docker run \
	    --name $(NAME) \
	    $(DOCKER_ARGS) \
	    -v $(MOCK_PATH):$(MOCK_PATH) \
	    -e ALERTMANAGER_URIS=$(ALERTMANAGER_URIS) \
	    -e COLOR_LABELS_UNIQUE="instance cluster" \
	    -e COLOR_LABELS_STATIC="job" \
	    -e DEBUG="$(GIN_DEBUG)" \
	    -e PORT=$(PORT) \
	    -p $(PORT):$(PORT) \
	    $(NAME):$(VERSION)

.PHONY: lint
lint: .build/deps.ok
	@golint ./... | (egrep -v "^vendor/|^bindata_assetfs.go" || true)
ifneq ($(JSHINT),)
	$(JSHINT) assets/static/*.js
endif
ifneq ($(ESLINT),)
	$(ESLINT) --quiet assets/static/*.js
endif

.PHONY: test
test: lint bindata_assetfs.go
	go test -bench=. -cover `go list ./... | grep -v /vendor/`

.build/vendor.ok:
	go get -u github.com/kardianos/govendor
	mkdir -p .build
	touch $@

.PHONY: vendor
vendor: .build/vendor.ok
	govendor remove +u
	govendor fetch +m +e

.PHONY: vendor-update
vendor-update: .build/vendor.ok
	govendor fetch +v
