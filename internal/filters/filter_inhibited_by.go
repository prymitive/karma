package filters

import (
	"strings"

	"github.com/prymitive/karma/internal/models"
)

type inhibitedByFilter struct {
	filterBase
}

func (filter *inhibitedByFilter) Match(alert *models.Alert, _ int) bool {
	var isMatch bool
	for _, am := range alert.Alertmanager {
		for _, silenceID := range am.InhibitedBy {
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

func (filter *inhibitedByFilter) MatchAlertmanager(am *models.AlertmanagerInstance) bool {
	for _, silenceID := range am.InhibitedBy {
		if filter.matcher.Compare(silenceID, filter.value) {
			return true
		}
	}
	return false
}

func newInhibitedByFilter(name, operator, rawText, value string) Filter {
	// operator is pre-validated by the registry, buildMatcher cannot fail here
	m, _ := buildMatcher(operator, value)
	return &inhibitedByFilter{
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

func inhibitedByAutocomplete(name string, operators []string, alerts []models.Alert, dst map[string]models.Autocomplete) {
	for _, alert := range alerts {
		for _, am := range alert.Alertmanager {
			for _, silenceID := range am.InhibitedBy {
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
