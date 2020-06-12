package config

import (
	"regexp"
	"time"
)

type AlertmanagerCORS struct {
	Credentials string
}

type AlertmanagerConfig struct {
	Cluster     string
	Name        string
	URI         string
	ExternalURI string `yaml:"external_uri" koanf:"external_uri"`
	Timeout     time.Duration
	Proxy       bool
	ReadOnly    bool `yaml:"readonly"`
	TLS         struct {
		CA                 string
		Cert               string
		Key                string
		InsecureSkipVerify bool `yaml:"insecureSkipVerify" koanf:"insecureSkipVerify"`
	}
	Headers map[string]string
	CORS    AlertmanagerCORS `yaml:"cors" koanf:"cors"`
}

type LinkDetectRules struct {
	Regex       string `yaml:"regex"`
	URITemplate string `yaml:"uriTemplate" koanf:"uriTemplate"`
}

type CustomLabelColor struct {
	Value         string         `yaml:"value,omitempty"`
	ValueRegex    string         `yaml:"value_re,omitempty" koanf:"value_re"`
	CompiledRegex *regexp.Regexp `yaml:"-"`
	Color         string         `yaml:"color"`
}

type CustomLabelColors map[string][]CustomLabelColor

type AuthenticationUser struct {
	Username string
	Password string
}

type AuthorizationGroup struct {
	Name    string
	Members []string
}

type configSchema struct {
	Authentication struct {
		Enabled bool `yaml:"-" koanf:"-"`
		Header  struct {
			Name       string
			ValueRegex string `yaml:"value_re" koanf:"value_re"`
		}
		BasicAuth struct {
			Users []AuthenticationUser
		} `yaml:"basicAuth" koanf:"basicAuth"`
	}
	Authorization struct {
		Groups []AuthorizationGroup
		ACL    struct {
			Silences string
		} `yaml:"acl" koanf:"acl"`
	}
	Alertmanager struct {
		Interval    time.Duration
		Servers     []AlertmanagerConfig
		Cluster     string           `yaml:"-" koanf:"cluster"`
		Name        string           `yaml:"-" koanf:"name"`
		Timeout     time.Duration    `yaml:"-" koanf:"timeout"`
		URI         string           `yaml:"-" koanf:"uri"`
		ExternalURI string           `yaml:"-" koanf:"external_uri"`
		Proxy       bool             `yaml:"-" koanf:"proxy"`
		ReadOnly    bool             `yaml:"-" koanf:"readonly"`
		CORS        AlertmanagerCORS `yaml:"-" koanf:"cors"`
	}
	AlertAcknowledgement struct {
		Enabled       bool
		Duration      time.Duration
		Author        string
		CommentPrefix string `yaml:"commentPrefix" koanf:"commentPrefix"`
	} `yaml:"alertAcknowledgement" koanf:"alertAcknowledgement"`
	Annotations struct {
		Default struct {
			Hidden bool
		}
		Hidden  []string
		Visible []string
		Keep    []string
		Strip   []string
		Order   []string
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
			} `yaml:"customValues" koanf:"customValues"`
		}
	} `yaml:"grid"`
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
		Config    bool
		Level     string
		Format    string
		Timestamp bool
	}
	Receivers struct {
		Keep  []string
		Strip []string
	}
	Sentry struct {
		Private string
		Public  string
	}
	Silences struct {
		Comments struct {
			LinkDetect struct {
				Rules []LinkDetectRules `yaml:"rules"`
			} `yaml:"linkDetect" koanf:"linkDetect"`
		} `yaml:"comments"`
	} `yaml:"silences"`
	SilenceForm struct {
		Strip struct {
			Labels []string
		}
	} `yaml:"silenceForm" koanf:"silenceForm"`
	UI struct {
		Refresh              time.Duration
		HideFiltersWhenIdle  bool   `yaml:"hideFiltersWhenIdle" koanf:"hideFiltersWhenIdle"`
		ColorTitlebar        bool   `yaml:"colorTitlebar" koanf:"colorTitlebar"`
		Theme                string `yaml:"theme" koanf:"theme"`
		MinimalGroupWidth    int    `yaml:"minimalGroupWidth" koanf:"minimalGroupWidth"`
		AlertsPerGroup       int    `yaml:"alertsPerGroup" koanf:"alertsPerGroup"`
		CollapseGroups       string `yaml:"collapseGroups" koanf:"collapseGroups"`
		MultiGridLabel       string `yaml:"multiGridLabel" koanf:"multiGridLabel"`
		MultiGridSortReverse bool   `yaml:"multiGridSortReverse" koanf:"multiGridSortReverse"`
	}
}
