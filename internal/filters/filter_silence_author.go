package filters

import (
	"fmt"
	"strings"

	"github.com/prymitive/karma/internal/models"
)

type silenceAuthorFilter struct {
	value string
	alertFilter
}

func (filter *silenceAuthorFilter) init(name string, matcher *matcherT, rawText string, isValid bool, value string) {
	filter.Matched = name
	if matcher != nil {
		filter.Matcher = *matcher
	}
	filter.RawText = rawText
	filter.IsValid = isValid
	filter.value = value
}

func (filter *silenceAuthorFilter) GetValue() string {
	return filter.value
}

func (filter *silenceAuthorFilter) Match(alert *models.Alert, _ int) bool {
	if filter.IsValid {
		var isMatch bool
		for _, am := range alert.Alertmanager {
			for _, silenceID := range am.SilencedBy {
				silence, found := am.Silences[silenceID]
				if found {
					m := filter.Matcher.Compare(silence.CreatedBy, filter.value)
					if m {
						isMatch = m
					}
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

func (filter *silenceAuthorFilter) MatchAlertmanager(am *models.AlertmanagerInstance) bool {
	var isMatch bool
	for _, silenceID := range am.SilencedBy {
		silence, found := am.Silences[silenceID]
		if found {
			m := filter.Matcher.Compare(silence.CreatedBy, filter.value)
			if m {
				isMatch = m
			}
		}
	}
	return isMatch
}

func newSilenceAuthorFilter() FilterT {
	f := silenceAuthorFilter{}
	f.IsAlertmanagerFilter = true
	return &f
}

func silenceAuthorAutocomplete(name string, operators []string, alerts []models.Alert, dst map[string]models.Autocomplete) {
	for _, alert := range alerts {
		for _, am := range alert.Alertmanager {
			for _, silenceID := range am.SilencedBy {
				for _, am := range alert.Alertmanager {
					silence, found := am.Silences[silenceID]
					if found {
						for _, operator := range operators {
							token := name + operator + silence.CreatedBy
							setAC(dst, token, []string{
								name,
								strings.TrimPrefix(name, "@"),
								name + operator,
								silence.CreatedBy,
							})
						}
					}
				}
			}
		}
	}
}
