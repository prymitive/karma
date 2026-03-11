package filters

import (
	"strings"

	"github.com/prymitive/karma/internal/models"
)

type silenceIDFilter struct {
	filterBase
}

func (filter *silenceIDFilter) Match(alert *models.Alert, _ int) bool {
	var isMatch bool
	for _, am := range alert.Alertmanager {
		for _, silenceID := range am.SilencedBy {
			if filter.matcher.Compare(silenceID, filter.value) {
				isMatch = true
			}
		}
	}
	if isMatch {
		filter.hits++
	}
	return isMatch
}

func (filter *silenceIDFilter) MatchAlertmanager(am *models.AlertmanagerInstance) bool {
	for _, silenceID := range am.SilencedBy {
		if filter.matcher.Compare(silenceID, filter.value) {
			return true
		}
	}
	return false
}

func newSilenceIDFilter(name, operator, rawText, value string) Filter {
	// operator is pre-validated by the registry, buildMatcher cannot fail here
	m, _ := buildMatcher(operator, value)
	return &silenceIDFilter{
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

func silenceIDAutocomplete(name string, operators []string, alerts []models.Alert, dst map[string]models.Autocomplete) {
	for _, alert := range alerts {
		for _, am := range alert.Alertmanager {
			for _, silenceID := range am.SilencedBy {
				for _, operator := range operators {
					token := name + operator + silenceID
					setAC(dst, token, []string{
						name,
						strings.TrimPrefix(name, "@"),
						name + operator,
						silenceID,
					})
				}
			}
		}
	}
}
