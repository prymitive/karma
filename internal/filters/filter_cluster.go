package filters

import (
	"fmt"
	"strings"

	"github.com/prymitive/karma/internal/models"
)

type alertmanagerClusterFilter struct {
	alertFilter
	value string
}

func (filter *alertmanagerClusterFilter) init(name string, matcher *matcherT, rawText string, isValid bool, value string) {
	filter.Matched = name
	if matcher != nil {
		filter.Matcher = *matcher
	}
	filter.RawText = rawText
	filter.IsValid = isValid
	filter.value = value
}

func (filter *alertmanagerClusterFilter) GetValue() string {
	return filter.value
}

func (filter *alertmanagerClusterFilter) Match(alert *models.Alert, _ int) bool {
	if filter.IsValid {
		var isMatch bool
		for _, am := range alert.Alertmanager {
			if filter.Matcher.Compare(am.Cluster, filter.value) {
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

func (filter *alertmanagerClusterFilter) MatchAlertmanager(am *models.AlertmanagerInstance) bool {
	return filter.Matcher.Compare(am.Cluster, filter.value)
}

func newAlertmanagerClusterFilter() FilterT {
	f := alertmanagerClusterFilter{}
	f.IsAlertmanagerFilter = true
	return &f
}

func alertmanagerClusterAutocomplete(name string, operators []string, alerts []models.Alert) []models.Autocomplete {
	tokens := map[string]*models.Autocomplete{}
	for _, alert := range alerts {
		for _, am := range alert.Alertmanager {
			for _, operator := range operators {
				switch operator {
				case equalOperator, notEqualOperator:
					token := name + operator + am.Cluster
					hint := makeAC(
						token,
						[]string{
							name,
							strings.TrimPrefix(name, "@"),
							name + operator,
						},
					)
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
