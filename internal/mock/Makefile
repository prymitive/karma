DOCKER_NAME  := alertmanager-unsee-mock
DOCKER_IMAGE := prom/alertmanager
DOCKER_ARGS  := --name $(DOCKER_NAME) --rm -d -p 9093:9093 -v $(CURDIR)/alertmanager.yml:/etc/alertmanager/config.yml

# list of Alertmanager versions to generate mock files for
VERSIONS := 0.4.0 0.4.1 0.4.2 0.5.0 0.5.1 0.6.0 0.6.2 0.7.0 0.7.1 0.8.0 0.9.0 0.9.1 0.10.0 0.11.0 0.12.0 0.13.0 0.14.0

%/.ok: livemock.py
	$(eval VERSION := $(word 1, $(subst /, ,$@)))
	@echo "Generating mock files for Alertmanager $(VERSION)"
	@docker pull $(DOCKER_IMAGE):v$(VERSION) > /dev/null
	@docker rm -f $(DOCKER_NAME) > /dev/null 2>&1 || true
	@echo "Starting Alertmanager"
	@docker run $(DOCKER_ARGS) $(DOCKER_IMAGE):v$(VERSION)
	@sleep 15
	@echo "Sending mock alerts and silences"
	@python livemock.py
	@mkdir -p $(CURDIR)/$(VERSION)/api/v1 $(CURDIR)/$(VERSION)/api/v1/alerts
	@echo "Collecting API responses"
	@curl --fail -s localhost:9093/api/v1/status | python -m json.tool > $(CURDIR)/$(VERSION)/api/v1/status
	@curl --fail -s localhost:9093/api/v1/silences | python -m json.tool > $(CURDIR)/$(VERSION)/api/v1/silences
	@curl --fail -s localhost:9093/api/v1/alerts/groups | python -m json.tool > $(CURDIR)/$(VERSION)/api/v1/alerts/groups
	@touch $(VERSION)/.ok
	@echo "Done"

.PHONY: all
all: $(foreach version, $(VERSIONS), $(version)/.ok)

.DEFAULT_GOAL := all
