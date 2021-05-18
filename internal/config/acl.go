package config

import (
	"fmt"
	"os"

	yaml "gopkg.in/yaml.v3"
)

type SilenceMatcher struct {
	Name       string `yaml:"name"`
	NameRegex  string `yaml:"name_re"`
	Value      string `yaml:"value"`
	ValueRegex string `yaml:"value_re"`
	IsRegex    *bool  `yaml:"isRegex"`
	IsEqual    *bool  `yaml:"isEqual"`
}

type SilenceACLMatchersConfig struct {
	Required []SilenceMatcher `yaml:"required"`
}

type SilenceFilters struct {
	Name       string `yaml:"name,omitempty"`
	NameRegex  string `yaml:"name_re,omitempty"`
	Value      string `yaml:"value,omitempty"`
	ValueRegex string `yaml:"value_re,omitempty"`
	IsRegex    *bool  `yaml:"isRegex,omitempty"`
	IsEqual    *bool  `yaml:"isEqual,omitempty"`
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

type silencesACLSchema struct {
	Rules []SilenceACLRule
}

func ReadSilenceACLConfig(path string) (*silencesACLSchema, error) {
	cfg := silencesACLSchema{}

	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("failed to load silence ACL configuration file %q: %v", path, err)
	}

	d := yaml.NewDecoder(f)
	d.KnownFields(true)
	err = d.Decode(&cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to parse silence ACL configuration file %q: %v", path, err)
	}

	return &cfg, nil
}
