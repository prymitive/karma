package filters

import (
	"fmt"
	"strings"

	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/slices"
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

func (filter *stateFilter) Match(alert *models.Alert, _ int) bool {
	if filter.IsValid {
		var isMatch bool
		for _, am := range alert.Alertmanager {
			if filter.Matcher.Compare(am.State, filter.Value) {
				isMatch = true
			}
		}
		if isMatch {
			filter.Hits++
		}
		return isMatch
	}
	e := fmt.Sprintf("Match() called on invalid filter %#v", filter)
	panic(e)
}

func (filter *stateFilter) MatchAlertmanager(am *models.AlertmanagerInstance) bool {
	return filter.Matcher.Compare(am.State, filter.Value)
}

func newStateFilter() FilterT {
	f := stateFilter{}
	f.IsAlertmanagerFilter = true
	return &f
}

func stateAutocomplete(name string, operators []string, alerts []models.Alert) []models.Autocomplete {
	tokens := make([]models.Autocomplete, 0, len(operators))
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
