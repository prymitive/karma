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
	equalOperator:         &equalMatcher{abstractMatcher{Operator: equalOperator}},
	notEqualOperator:      &notEqualMatcher{abstractMatcher{Operator: notEqualOperator}},
	moreThanOperator:      &moreThanMatcher{abstractMatcher{Operator: moreThanOperator}},
	lessThanOperator:      &lessThanMatcher{abstractMatcher{Operator: lessThanOperator}},
	regexpOperator:        &regexpMatcher{abstractMatcher{Operator: regexpOperator}},
	negativeRegexOperator: &negativeRegexMatcher{abstractMatcher{Operator: negativeRegexOperator}},
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
	{
		Label:              "@alertmanager",
		LabelRe:            regexp.MustCompile("^@alertmanager$"),
		SupportedOperators: []string{regexpOperator, negativeRegexOperator, equalOperator, notEqualOperator},
		Factory:            newAlertmanagerInstanceFilter,
		Autocomplete:       alertmanagerInstanceAutocomplete,
	},
	{
		Label:              "@cluster",
		LabelRe:            regexp.MustCompile("^@cluster$"),
		SupportedOperators: []string{regexpOperator, negativeRegexOperator, equalOperator, notEqualOperator},
		Factory:            newAlertmanagerClusterFilter,
		Autocomplete:       alertmanagerClusterAutocomplete,
	},
	{
		Label:              "@state",
		LabelRe:            regexp.MustCompile("^@state$"),
		SupportedOperators: []string{equalOperator, notEqualOperator},
		Factory:            newStateFilter,
		Autocomplete:       stateAutocomplete,
	},
	{
		Label:              "@fingerprint",
		LabelRe:            regexp.MustCompile("^@fingerprint$"),
		SupportedOperators: []string{regexpOperator, equalOperator, notEqualOperator},
		Factory:            newFingerprintFilter,
	},
	{
		Label:              "@receiver",
		LabelRe:            regexp.MustCompile("^@receiver$"),
		SupportedOperators: []string{regexpOperator, negativeRegexOperator, equalOperator, notEqualOperator},
		Factory:            newreceiverFilter,
		Autocomplete:       receiverAutocomplete,
	},
	{
		Label:              "@age",
		LabelRe:            regexp.MustCompile("^@age$"),
		SupportedOperators: []string{lessThanOperator, moreThanOperator},
		Factory:            newAgeFilter,
		Autocomplete:       ageAutocomplete,
	},
	{
		Label:              "@silence_id",
		LabelRe:            regexp.MustCompile("^@silence_id$"),
		SupportedOperators: []string{equalOperator, notEqualOperator},
		Factory:            newsilenceIDFilter,
		Autocomplete:       silenceIDAutocomplete,
	},
	{
		Label:              "@silence_ticket",
		LabelRe:            regexp.MustCompile("^@silence_ticket$"),
		SupportedOperators: []string{regexpOperator, negativeRegexOperator, equalOperator, notEqualOperator},
		Factory:            newSilenceTicketFilter,
		Autocomplete:       silenceTicketIDAutocomplete,
	},
	{
		Label:              "@silence_author",
		LabelRe:            regexp.MustCompile("^@silence_author$"),
		SupportedOperators: []string{regexpOperator, negativeRegexOperator, equalOperator, notEqualOperator},
		Factory:            newSilenceAuthorFilter,
		Autocomplete:       silenceAuthorAutocomplete,
	},
	{
		Label:              "@limit",
		LabelRe:            regexp.MustCompile("^@limit$"),
		SupportedOperators: []string{equalOperator},
		Factory:            newLimitFilter,
		Autocomplete:       limitAutocomplete,
	},
	{
		Label:              "[a-zA-Z_][a-zA-Z0-9_]*",
		LabelRe:            regexp.MustCompile("^[a-zA-Z_][a-zA-Z0-9_]*$"),
		SupportedOperators: []string{regexpOperator, negativeRegexOperator, equalOperator, notEqualOperator, lessThanOperator, moreThanOperator},
		Factory:            newLabelFilter,
		Autocomplete:       labelAutocomplete,
	},
}
