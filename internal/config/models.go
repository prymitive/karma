package config

import (
	"regexp"
	"time"
)

type alertmanagerConfig struct {
	Name        string
	URI         string
	ExternalURI string `yaml:"external_uri" mapstructure:"external_uri"`
	Timeout     time.Duration
	Proxy       bool
	TLS         struct {
		CA                 string
		Cert               string
		Key                string
		InsecureSkipVerify bool `yaml:"insecureSkipVerify"  mapstructure:"insecureSkipVerify"`
	}
	Headers map[string]string
}

type jiraRule struct {
	Regex string
	URI   string
}

type CustomLabelColor struct {
	Value         string         `yaml:"value" mapstructure:"value"`
	ValueRegex    string         `yaml:"value_re" mapstructure:"value_re"`
	CompiledRegex *regexp.Regexp `yaml:"-" mapstructure:"-"`
	Color         string         `yaml:"color" mapstructure:"color"`
}

type CustomLabelColors map[string][]CustomLabelColor

type configSchema struct {
	Alertmanager struct {
		Interval time.Duration
		Servers  []alertmanagerConfig
	}
	AlertAcknowledgement struct {
		Enabled       bool
		Duration      time.Duration
		Author        string
		CommentPrefix string `yaml:"commentPrefix"  mapstructure:"commentPrefix"`
	} `yaml:"alertAcknowledgement"  mapstructure:"alertAcknowledgement"`
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
			Order        string
			Reverse      bool
			Label        string
			CustomValues struct {
				Labels map[string]map[string]string
			} `yaml:"customValues" mapstructure:"customValues"`
		}
	}
	Karma struct {
		Name string
	}
	Labels struct {
		Keep  []string
		Strip []string
		Color struct {
			Custom CustomLabelColors
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
		Format string
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
	SilenceForm struct {
		Author struct {
			PopulateFromHeader struct {
				Header     string `yaml:"header"  mapstructure:"header"`
				ValueRegex string `yaml:"value_re"  mapstructure:"value_re"`
			} `yaml:"populate_from_header"  mapstructure:"populate_from_header"`
		} `yaml:"author"  mapstructure:"author"`
		Strip struct {
			Labels []string
		}
	} `yaml:"silenceForm"  mapstructure:"silenceForm"`
	UI struct {
		Refresh             time.Duration
		HideFiltersWhenIdle bool   `yaml:"hideFiltersWhenIdle" mapstructure:"hideFiltersWhenIdle"`
		ColorTitlebar       bool   `yaml:"colorTitlebar" mapstructure:"colorTitlebar"`
		DarkTheme           bool   `yaml:"darkTheme" mapstructure:"darkTheme"`
		MinimalGroupWidth   int    `yaml:"minimalGroupWidth" mapstructure:"minimalGroupWidth"`
		AlertsPerGroup      int    `yaml:"alertsPerGroup" mapstructure:"alertsPerGroup"`
		CollapseGroups      string `yaml:"collapseGroups" mapstructure:"collapseGroups"`
	}
}
