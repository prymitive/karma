package filters

import (
	"fmt"
	"strings"

	"github.com/cloudflare/unsee/internal/models"
	"github.com/cloudflare/unsee/internal/slices"
)

type stateFilter struct {
	alertFilter
}

func (filter *stateFilter) init(name string, matcher *matcherT, rawText string, isValid bool, value string) {
	filter.Matched = name
	if matcher != nil {
		filter.Matcher = *matcher
	}
	filter.RawText = rawText
	filter.IsValid = isValid
	filter.Value = value
	if !slices.StringInSlice(models.AlertStateList, value) {
		filter.IsValid = false
	}
}

func (filter *stateFilter) Match(alert *models.Alert, matches int) bool {
	if filter.IsValid {
		isMatch := filter.Matcher.Compare(alert.State, filter.Value)
		if isMatch {
			filter.Hits++
		}
		return isMatch
	}
	e := fmt.Sprintf("Match() called on invalid filter %#v", filter)
	panic(e)
}

func newStateFilter() FilterT {
	f := stateFilter{}
	return &f
}

func stateAutocomplete(name string, operators []string, alerts []models.Alert) []models.Autocomplete {
	tokens := []models.Autocomplete{}
	for _, operator := range operators {
		for _, alert := range alerts {
			tokens = append(tokens, makeAC(
				name+operator+alert.State,
				[]string{
					name,
					strings.TrimPrefix(name, "@"),
					name + operator,
				},
			))
		}
	}
	return tokens
}
