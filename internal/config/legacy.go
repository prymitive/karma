package config

import (
	"os"
	"strings"
	"time"

	log "github.com/sirupsen/logrus"
	"github.com/spf13/viper"
)

func (config *configSchema) legacyEnvs(v *viper.Viper) {
	// legacy env variables
	v.BindEnv("alertmanager.interval", "ALERTMANAGER_TTL")
	v.BindEnv("annotations.default.hidden", "ANNOTATIONS_DEFAULT_HIDDEN")
	v.BindEnv("annotations.hidden", "ANNOTATIONS_HIDE")
	v.BindEnv("annotations.visible", "ANNOTATIONS_SHOW")
	v.BindEnv("labels.color.static", "COLOR_LABELS_STATIC")
	v.BindEnv("labels.color.unique", "COLOR_LABELS_UNIQUE")
	v.BindEnv("labels.keep", "KEEP_LABELS")
	v.BindEnv("labels.strip", "STRIP_LABELS")
	v.BindEnv("listen.prefix", "WEB_PREFIX")
	v.BindEnv("receivers.strip", "STRIP_RECEIVERS")
	v.BindEnv("sentry.public", "SENTRY_PUBLIC_DSN")
}

func (config *configSchema) legacySettingsFallback() {
	// no Alertmanager servers configured and legacy ALERTMANAGER_URIS is present
	if len(config.Alertmanager.Servers) == 0 && os.Getenv("ALERTMANAGER_URIS") != "" {
		log.Warn("ALERTMANAGER_URIS env variable is deprecated")
		for _, s := range strings.Split(os.Getenv("ALERTMANAGER_URIS"), " ") {
			z := strings.SplitN(s, ":", 2)
			if len(z) != 2 {
				log.Fatalf("Invalid Alertmanager URI '%s', expected format 'name:uri'", s)
				continue
			}
			name := z[0]
			uri := z[1]
			ac := alertmanagerConfig{
				Name:    name,
				URI:     uri,
				Timeout: time.Second * 40,
			}
			if os.Getenv("ALERTMANAGER_TIMEOUT") != "" {
				log.Warn("ALERTMANAGER_TIMEOUT env variable is deprecated and will be removed in the next release")
				timeout, err := time.ParseDuration(os.Getenv("ALERTMANAGER_TIMEOUT"))
				if err != nil {
					log.Fatalf("Invalid ALERTMANAGER_TIMEOUT: %s", err)
				}
				ac.Timeout = timeout
			}
			config.Alertmanager.Servers = append(config.Alertmanager.Servers, ac)
		}
	}

	// no default filters and legacy FILTER_DEFAULT is present
	if len(config.Filters.Default) == 0 && os.Getenv("FILTER_DEFAULT") != "" {
		log.Warn("FILTER_DEFAULT env variable is deprecated and will be removed in the next release")
		config.Filters.Default = strings.Split(os.Getenv("FILTER_DEFAULT"), ",")
	}

	// no jira rules configured and legacy JIRA_REGEX is present
	if len(config.JIRA) == 0 && os.Getenv("JIRA_REGEX") != "" {
		log.Warn("JIRA_REGEX env variable is deprecated and will be removed in the next release")
		rules := []jiraRule{}
		for _, s := range strings.Split(os.Getenv("JIRA_REGEX"), " ") {
			ss := strings.SplitN(s, "@", 2)
			re := ss[0]
			url := ss[1]
			if re == "" || url == "" {
				log.Fatalf("Invalid JIRA rule '%s', regexp part is '%s', url is '%s'", s, re, url)
			}
			rules = append(rules, jiraRule{Regex: re, URI: url})
		}
		config.JIRA = rules
	}
}
