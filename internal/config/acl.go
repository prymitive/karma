package config

import (
	"fmt"
	"os"

	yaml "gopkg.in/yaml.v3"
)

type SilenceMatcher struct {
	IsRegex    *bool  `yaml:"isRegex"`
	IsEqual    *bool  `yaml:"isEqual"`
	Name       string `yaml:"name"`
	NameRegex  string `yaml:"name_re"`
	Value      string `yaml:"value"`
	ValueRegex string `yaml:"value_re"`
}

type SilenceACLMatchersConfig struct {
	Required []SilenceMatcher `yaml:"required"`
}

type SilenceFilters struct {
	IsRegex    *bool  `yaml:"isRegex,omitempty"`
	IsEqual    *bool  `yaml:"isEqual,omitempty"`
	Name       string `yaml:"name,omitempty"`
	NameRegex  string `yaml:"name_re,omitempty"`
	Value      string `yaml:"value,omitempty"`
	ValueRegex string `yaml:"value_re,omitempty"`
}

type SilenceACLRuleScope struct {
	Groups        []string
	Alertmanagers []string
	Filters       []SilenceFilters
}

type SilenceACLRule struct {
	Action   string
	Reason   string
	Scope    SilenceACLRuleScope
	Matchers SilenceACLMatchersConfig
}

type SilencesACLSchema struct {
	Rules []SilenceACLRule
}

func ReadSilenceACLConfig(path string) (*SilencesACLSchema, error) {
	cfg := SilencesACLSchema{}

	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("failed to load silence ACL configuration file %q: %w", path, err)
	}

	d := yaml.NewDecoder(f)
	d.KnownFields(true)
	err = d.Decode(&cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to parse silence ACL configuration file %q: %w", path, err)
	}

	return &cfg, nil
}
