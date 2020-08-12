include make/vars.mk

word-split = $(word $2,$(subst -, ,$1))
cc-%: go.mod go.sum cmd/karma/bindata_assetfs.go $(SOURCES_GO)
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

PLATFORMS := cc-darwin-amd64 cc-dragonfly-amd64
crosscompile: $(PLATFORMS)
	@echo
