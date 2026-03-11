package filters

import (
	"strings"

	"github.com/prymitive/karma/internal/models"
)

type stateFilter struct {
	filterBase
}

func (filter *stateFilter) Match(alert *models.Alert, _ int) bool {
	var isMatch bool
	for _, am := range alert.Alertmanager {
		if filter.matcher.Compare(am.State.String(), filter.value) {
			isMatch = true
		}
	}
	if isMatch {
		filter.hits++
	}
	return isMatch
}

func (filter *stateFilter) MatchAlertmanager(am *models.AlertmanagerInstance) bool {
	return filter.matcher.Compare(am.State.String(), filter.value)
}

func newStateFilter(name, operator, rawText, value string) Filter {
	if _, ok := models.AlertStateFromString(value); !ok {
		return &filterBase{rawText: rawText}
	}
	// operator is pre-validated by the registry, buildMatcher cannot fail here
	m, _ := buildMatcher(operator, value)
	return &stateFilter{
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

func stateAutocomplete(name string, operators []string, alerts []models.Alert, dst map[string]models.Autocomplete) {
	for _, operator := range operators {
		for _, alert := range alerts {
			token := name + operator + alert.State.String()
			setAC(dst, token, []string{
				name,
				strings.TrimPrefix(name, "@"),
				name + operator,
			})
		}
	}
}
