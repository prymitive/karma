package filters

import "regexp"

const (
	equalOperator         string = "="
	notEqualOperator      string = "!="
	moreThanOperator      string = ">"
	lessThanOperator      string = "<"
	regexpOperator        string = "=~"
	negativeRegexOperator string = "!~"
)

// this needs to be hand crafted because any of the supported operator chars
// should be considered part of the operator expression
// this is needed to catch errors in operators, for example:
// a===b should yield an error
var matcherRegex = "[=!<>~]+"

// same as matcherRegex but for the filter name part
var filterRegex = "^(@)?[a-zA-Z_][a-zA-Z0-9_]*"

var matcherConfig = map[string]matcherT{
	equalOperator:         &equalMatcher{},
	notEqualOperator:      &notEqualMatcher{},
	moreThanOperator:      &moreThanMatcher{},
	lessThanOperator:      &lessThanMatcher{},
	regexpOperator:        &regexpMatcher{},
	negativeRegexOperator: &negativeRegexMatcher{},
}

type filterConfig struct {
	Label              string
	LabelRe            *regexp.Regexp
	SupportedOperators []string
	Factory            newFilterFactory
	Autocomplete       autocompleteFactory
}

// AllFilters contains the mapping of all filters along with operators they
// support
var AllFilters = []filterConfig{
	filterConfig{
		Label:              "@status",
		LabelRe:            regexp.MustCompile("^@status$"),
		SupportedOperators: []string{equalOperator, notEqualOperator},
		Factory:            newstatusFilter,
		Autocomplete:       statusAutocomplete,
	},
	filterConfig{
		Label:              "@age",
		LabelRe:            regexp.MustCompile("^@age$"),
		SupportedOperators: []string{lessThanOperator, moreThanOperator},
		Factory:            newAgeFilter,
		Autocomplete:       ageAutocomplete,
	},
	filterConfig{
		Label:              "@silence_jira",
		LabelRe:            regexp.MustCompile("^@silence_jira$"),
		SupportedOperators: []string{regexpOperator, negativeRegexOperator, equalOperator, notEqualOperator},
		Factory:            newSilenceJiraFilter,
		Autocomplete:       sinceJiraIDAutocomplete,
	},
	filterConfig{
		Label:              "@silence_author",
		LabelRe:            regexp.MustCompile("^@silence_author$"),
		SupportedOperators: []string{regexpOperator, negativeRegexOperator, equalOperator, notEqualOperator},
		Factory:            newSilenceAuthorFilter,
		Autocomplete:       sinceAuthorAutocomplete,
	},
	filterConfig{
		Label:              "@limit",
		LabelRe:            regexp.MustCompile("^@limit$"),
		SupportedOperators: []string{equalOperator},
		Factory:            newLimitFilter,
		Autocomplete:       limitAutocomplete,
	},
	filterConfig{
		Label:              "[a-zA-Z_][a-zA-Z0-9_]*",
		LabelRe:            regexp.MustCompile("^[a-zA-Z_][a-zA-Z0-9_]*$"),
		SupportedOperators: []string{regexpOperator, negativeRegexOperator, equalOperator, notEqualOperator, lessThanOperator, moreThanOperator},
		Factory:            newLabelFilter,
		Autocomplete:       labelAutocomplete,
	},
}
