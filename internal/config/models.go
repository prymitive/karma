package config

import "time"

type alertmanagerConfig struct {
	Name    string
	URI     string
	Timeout time.Duration
	Proxy   bool
	TLS     struct {
		CA   string
		Cert string
		Key  string
	}
}

type jiraRule struct {
	Regex string
	URI   string
}

type configSchema struct {
	Alertmanager struct {
		Interval time.Duration
		Servers  []alertmanagerConfig
	}
	Annotations struct {
		Default struct {
			Hidden bool
		}
		Hidden  []string
		Visible []string
	}
	Debug   bool
	Filters struct {
		Default []string
	}
	Labels struct {
		Keep  []string
		Strip []string
		Color struct {
			Static []string
			Unique []string
		}
	}
	Listen struct {
		Address string
		Port    int
		Prefix  string
	}
	Log struct {
		Config bool
		Level  string
	}
	JIRA      []jiraRule
	Receivers struct {
		Keep  []string
		Strip []string
	}
	Sentry struct {
		Private string
		Public  string
	}
}
