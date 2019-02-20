package config

import "time"

type alertmanagerConfig struct {
	Name    string
	URI     string
	Timeout time.Duration
	Proxy   bool
	TLS     struct {
		CA                 string
		Cert               string
		Key                string
		InsecureSkipVerify bool `yaml:"insecureSkipVerify"`
	}
	Headers map[string]string
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
		Keep    []string
		Strip   []string
	}
	Custom struct {
		CSS string
		JS  string
	}
	Debug   bool
	Filters struct {
		Default []string
	}
	Grid struct {
		Sorting struct {
			Order   string
			Reverse bool
			Label   string
		}
	}
	Labels struct {
		Keep  []string
		Strip []string
		Color struct {
			Custom map[string]map[string]string
			Static []string
			Unique []string
		}
		Sorting struct {
			ValueMapping map[string]map[string]int `yaml:"valueMapping"`
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
