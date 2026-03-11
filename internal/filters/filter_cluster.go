package filters

import (
	"strings"

	"github.com/prymitive/karma/internal/models"
)

type alertmanagerClusterFilter struct {
	filterBase
}

func (filter *alertmanagerClusterFilter) Match(alert *models.Alert, _ int) bool {
	var isMatch bool
	for _, am := range alert.Alertmanager {
		if filter.matcher.Compare(am.Cluster, filter.value) {
			isMatch = true
		}
	}
	if isMatch {
		filter.hits++
	}
	return isMatch
}

func (filter *alertmanagerClusterFilter) MatchAlertmanager(am *models.AlertmanagerInstance) bool {
	return filter.matcher.Compare(am.Cluster, filter.value)
}

func newAlertmanagerClusterFilter(name, operator, rawText, value string) Filter {
	m, ok := buildMatcher(operator, value)
	if !ok {
		return &filterBase{rawText: rawText}
	}
	return &alertmanagerClusterFilter{
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

func alertmanagerClusterAutocomplete(name string, operators []string, alerts []models.Alert, dst map[string]models.Autocomplete) {
	for _, alert := range alerts {
		for _, am := range alert.Alertmanager {
			for _, operator := range operators {
				switch operator {
				case equalOperator, notEqualOperator:
					token := name + operator + am.Cluster
					setAC(dst, token, []string{
						name,
						strings.TrimPrefix(name, "@"),
						name + operator,
					})
				}
			}
		}
	}
}
