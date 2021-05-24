DOCKER_NAME  := alertmanager-karma-mock
DOCKER_IMAGE := prom/alertmanager
DOCKER_ARGS  := --name $(DOCKER_NAME) --rm -d -p 9093:9093 \
                -v $(CURDIR)/alertmanager.yml:/etc/alertmanager/config.yml \
								-v $(CURDIR)/alertmanager.yml:/etc/alertmanager/alertmanager.yml

# list of Alertmanager versions to generate mock files for
VERSIONS := 0.19.0 0.20.0 0.21.0 0.22.0

%/.ok: livemock.py
	$(eval VERSION := $(word 1, $(subst /, ,$@)))
	$(eval VERSION_MAJOR := $(word 2,$(subst ., ,$(VERSION))))
	$(eval API := $(shell (test $(VERSION_MAJOR) -gt 16 && echo 2) || echo 1))

	@echo "+ Generating mock files for Alertmanager $(VERSION) with API $(API)"
	docker pull $(DOCKER_IMAGE):v$(VERSION)
	@docker rm -f $(DOCKER_NAME) > /dev/null 2>&1 || true

	@echo "+ Starting Alertmanager"
	docker run $(DOCKER_ARGS) $(DOCKER_IMAGE):v$(VERSION)
	@sleep 15

	@echo "+ Sending mock alerts and silences"
	@python3 livemock.py
	@echo "+ Collecting API responses"

	@mkdir -p $(CURDIR)/$(VERSION)/api/v$(API) $(CURDIR)/$(VERSION)/api/v$(API)/alerts
	@curl --fail -s localhost:9093/metrics > $(CURDIR)/$(VERSION)/metrics
	@curl --fail -s localhost:9093/api/v$(API)/status | python3 -m json.tool > $(CURDIR)/$(VERSION)/api/v$(API)/status
	@curl --fail -s localhost:9093/api/v$(API)/silences | python3 -m json.tool > $(CURDIR)/$(VERSION)/api/v$(API)/silences
	@curl --fail -s localhost:9093/api/v$(API)/alerts/groups | python3 -m json.tool > $(CURDIR)/$(VERSION)/api/v$(API)/alerts/groups

	@touch $(VERSION)/.ok
	@docker rm -f $(DOCKER_NAME)
	@echo "+ Done"

.PHONY: all
all: $(foreach version, $(VERSIONS), $(version)/.ok)

.DEFAULT_GOAL := all
