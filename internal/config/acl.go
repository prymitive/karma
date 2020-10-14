package config

import (
	"fmt"
	"io/ioutil"

	yaml "gopkg.in/yaml.v2"
)

type SilenceMatcher struct {
	Name       string `yaml:"name"`
	NameRegex  string `yaml:"name_re"`
	Value      string `yaml:"value"`
	ValueRegex string `yaml:"value_re"`
	IsRegex    bool   `yaml:"isRegex"`
}

type SilenceACLMatchersConfig struct {
	Required []SilenceMatcher `yaml:"required"`
}

type SilenceFilters struct {
	Name       string `yaml:"name,omitempty"`
	NameRegex  string `yaml:"name_re,omitempty"`
	Value      string `yaml:"value,omitempty"`
	ValueRegex string `yaml:"value_re,omitempty"`
	IsRegex    bool   `yaml:"isRegex"`
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

	f, err := ioutil.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to load silence ACL configuration file %q: %v", path, err)
	}

	err = yaml.UnmarshalStrict(f, &cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to parse silence ACL configuration file %q: %v", path, err)
	}

	return &cfg, nil
}
