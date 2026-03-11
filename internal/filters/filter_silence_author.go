package filters

import (
	"strings"

	"github.com/prymitive/karma/internal/models"
)

type silenceAuthorFilter struct {
	filterBase
}

func (filter *silenceAuthorFilter) Match(alert *models.Alert, _ int) bool {
	var isMatch bool
	for _, am := range alert.Alertmanager {
		for _, silenceID := range am.SilencedBy {
			silence, found := am.Silences[silenceID]
			if found {
				if filter.matcher.Compare(silence.CreatedBy, filter.value) {
					isMatch = true
				}
			}
		}
	}
	if isMatch {
		filter.hits++
	}
	return isMatch
}

func (filter *silenceAuthorFilter) MatchAlertmanager(am *models.AlertmanagerInstance) bool {
	for _, silenceID := range am.SilencedBy {
		silence, found := am.Silences[silenceID]
		if found {
			if filter.matcher.Compare(silence.CreatedBy, filter.value) {
				return true
			}
		}
	}
	return false
}

func newSilenceAuthorFilter(name, operator, rawText, value string) Filter {
	m, ok := buildMatcher(operator, value)
	if !ok {
		return &filterBase{rawText: rawText}
	}
	return &silenceAuthorFilter{
		filterBase: filterBase{
			matcher:              m,
			name:                 name,
			rawText:              rawText,
			value:                value,
			isValid:              true,
			isAlertmanagerFilter: true,
		},
	}
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
