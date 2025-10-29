package filters

import (
	"fmt"
	"slices"
	"strings"

	"github.com/prymitive/karma/internal/models"
)

type stateFilter struct {
	alertFilter
	value string
}

func (filter *stateFilter) init(name string, matcher *matcherT, rawText string, isValid bool, value string) {
	filter.Matched = name
	if matcher != nil {
		filter.Matcher = *matcher
	}
	filter.RawText = rawText
	filter.IsValid = isValid
	filter.value = value
	if !slices.Contains(models.AlertStateList, models.NewUniqueString(value)) {
		filter.IsValid = false
	}
}

func (filter *stateFilter) GetValue() string {
	return filter.value
}

func (filter *stateFilter) Match(alert *models.Alert, _ int) bool {
	if filter.IsValid {
		var isMatch bool
		for _, am := range alert.Alertmanager {
			if filter.Matcher.Compare(am.State.Value(), filter.value) {
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
	return filter.Matcher.Compare(am.State.Value(), filter.value)
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
				name+operator+alert.State.Value(),
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
