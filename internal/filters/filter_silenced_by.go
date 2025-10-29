package filters

import (
	"fmt"
	"strings"

	"github.com/prymitive/karma/internal/models"
)

type silenceIDFilter struct {
	alertFilter
	value string
}

func (filter *silenceIDFilter) init(name string, matcher *matcherT, rawText string, isValid bool, value string) {
	filter.Matched = name
	if matcher != nil {
		filter.Matcher = *matcher
	}
	filter.RawText = rawText
	filter.IsValid = isValid
	filter.value = value
}

func (filter *silenceIDFilter) GetValue() string {
	return filter.value
}

func (filter *silenceIDFilter) Match(alert *models.Alert, _ int) bool {
	if filter.IsValid {
		var isMatch bool
		for _, am := range alert.Alertmanager {
			for _, silenceID := range am.SilencedBy {
				m := filter.Matcher.Compare(silenceID, filter.value)
				if m {
					isMatch = m
				}
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

func (filter *silenceIDFilter) MatchAlertmanager(am *models.AlertmanagerInstance) bool {
	var isMatch bool
	for _, silenceID := range am.SilencedBy {
		m := filter.Matcher.Compare(silenceID, filter.value)
		if m {
			isMatch = m
		}
	}
	return isMatch
}

func newsilenceIDFilter() FilterT {
	f := silenceIDFilter{}
	f.IsAlertmanagerFilter = true
	return &f
}

func silenceIDAutocomplete(name string, operators []string, alerts []models.Alert) []models.Autocomplete {
	tokens := map[string]*models.Autocomplete{}
	for _, alert := range alerts {
		for _, am := range alert.Alertmanager {
			for _, silenceID := range am.SilencedBy {
				for _, operator := range operators {
					token := name + operator + silenceID
					hint := makeAC(token, []string{
						name,
						strings.TrimPrefix(name, "@"),
						name + operator,
						silenceID,
					})
					tokens[token] = &hint
				}
			}
		}
	}
	acData := make([]models.Autocomplete, 0, len(tokens))
	for _, token := range tokens {
		acData = append(acData, *token)
	}
	return acData
}
