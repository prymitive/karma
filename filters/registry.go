package filters

const (
	equalOperator         string = "="
	notEqualOperator      string = "!="
	moreThanOperator      string = ">"
	lessThanOperator      string = "<"
	regexpOperator        string = "=~"
	negativeRegexOperator string = "!~"
)

var matcherConfig = map[string]matcherT{
	equalOperator:         &equalMatcher{},
	notEqualOperator:      &notEqualMatcher{},
	moreThanOperator:      &moreThanMatcher{},
	lessThanOperator:      &lessThanMatcher{},
	regexpOperator:        &regexpMatcher{},
	negativeRegexOperator: &negativeRegexMatcher{},
}

type filterConfig struct {
	IsSimple           bool
	Label              string
	SupportedOperators []string
	Factory            newFilterFactory
	Autocomplete       autocompleteFactory
}

// AllFilters contains the mapping of all filters along with operators they
// support
var AllFilters = []filterConfig{
	filterConfig{
		Label:              "@silenced",
		SupportedOperators: []string{equalOperator, notEqualOperator},
		Factory:            newSilencedFilter,
		Autocomplete:       silencedAutocomplete,
	},
	filterConfig{
		Label:              "@age",
		SupportedOperators: []string{lessThanOperator, moreThanOperator},
		Factory:            newAgeFilter,
		Autocomplete:       ageAutocomplete,
	},
	filterConfig{
		Label:              "@silence_jira",
		SupportedOperators: []string{regexpOperator, negativeRegexOperator, equalOperator, notEqualOperator},
		Factory:            newSilenceJiraFilter,
		Autocomplete:       sinceJiraIDAutocomplete,
	},
	filterConfig{
		Label:              "@silence_author",
		SupportedOperators: []string{regexpOperator, negativeRegexOperator, equalOperator, notEqualOperator},
		Factory:            newSilenceAuthorFilter,
		Autocomplete:       sinceAuthorAutocomplete,
	},
	filterConfig{
		Label:              "@limit",
		SupportedOperators: []string{equalOperator},
		Factory:            newLimitFilter,
		Autocomplete:       limitAutocomplete,
	},
	filterConfig{
		Label:              "[a-zA-Z_][a-zA-Z0-9_]*",
		SupportedOperators: []string{regexpOperator, negativeRegexOperator, equalOperator, notEqualOperator, lessThanOperator, moreThanOperator},
		Factory:            newLabelFilter,
		Autocomplete:       labelAutocomplete,
	},
	filterConfig{
		IsSimple: true,
		Factory:  newFuzzyFilter,
	},
}
