
ASSETS_DIR := $(CURDIR)/static/managed
CDNJS_PREFIX := https://cdnjs.cloudflare.com/ajax/libs

%.js:
	$(eval VERSION := $(word 2, $(subst /, ,$@)))
	$(eval DIRNAME := $(shell dirname $@))
	$(eval BASENAME := $(shell basename $@))
	$(eval MAPPATH := $(@:.js=.map))
	$(eval MAPFILE := $(shell basename $(MAPPATH)))
	$(eval OUTPUT := $(ASSETS_DIR)/js/$(VERSION)-$(BASENAME))
	@echo Fetching js asset $@
	@mkdir -p $(ASSETS_DIR)/js
	@curl --fail -so $(OUTPUT) $(CDNJS_PREFIX)/$@ || (rm -f $(OUTPUT) && exit 1)
	@( \
	    export MAP=`grep sourceMappingURL $(OUTPUT) | cut -d = -f 2`; \
		(test -n "$$MAP" && echo "+ Fetching js map $${MAP}" && (curl --fail -so $(ASSETS_DIR)/js/$${MAP} $(CDNJS_PREFIX)/$(DIRNAME)/$$MAP || rm -f $(ASSETS_DIR)/js/$${MAP})); \
		(test -z "$$MAP" && echo "+ Fetching js map $(MAPPATH)" && (curl --fail -so $(ASSETS_DIR)/js/$(MAPFILE) $(CDNJS_PREFIX)/$(MAPPATH) || rm -f $(ASSETS_DIR)/js/$(MAPFILE)) || true); \
	    ) || true
	@echo $(VERSION)-$(shell basename $@) >> $(ASSETS_DIR)/js/assets.txt

%.css:
	$(eval VERSION := $(word 2, $(subst /, ,$@)))
	$(eval OUTPUT := $(ASSETS_DIR)/css/$(VERSION)-$(shell basename $@))
	@echo Fetching css asset $@
	@mkdir -p $(ASSETS_DIR)/css
	@curl --fail -so $(OUTPUT) $(CDNJS_PREFIX)/$@ || (rm -f $(OUTPUT) && exit 1)
	@echo $(VERSION)-$(shell basename $@) >> $(ASSETS_DIR)/css/assets.txt

font-awesome/4.7.0/fonts/%:
	$(eval OUTPUT := $(ASSETS_DIR)/fonts/$(shell basename $@))
	@echo Fetching fonts asset $@
	@mkdir -p $(ASSETS_DIR)/fonts
	@curl --fail -so $(OUTPUT) $(CDNJS_PREFIX)/$@ || (rm -f $(OUTPUT) && exit 1)

.PHONY: clean-assets
clean-assets:
	@git rm -f $(ASSETS_DIR)/*/* >/dev/null 2>&1 || true

.PHONY: assets
assets: clean-assets
# datepicker widget for bootstrap3
assets: bootstrap-datetimepicker/4.17.47/js/bootstrap-datetimepicker.min.js
assets: bootstrap-datetimepicker/4.17.47/css/bootstrap-datetimepicker.min.css
# loaders.css, for animated spinners
assets: loaders.css/0.1.2/loaders.css.min.js
assets: loaders.css/0.1.2/loaders.min.css
assets:
	@git add $(ASSETS_DIR)/*/*
