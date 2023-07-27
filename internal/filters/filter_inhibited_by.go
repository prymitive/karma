package filters

import (
	"fmt"
	"strings"

	"github.com/prymitive/karma/internal/models"
)

type inhibitedByFilter struct {
	alertFilter
}

func (filter *inhibitedByFilter) Match(alert *models.Alert, _ int) bool {
	if filter.IsValid {
		var isMatch bool
		for _, am := range alert.Alertmanager {
			for _, silenceID := range am.InhibitedBy {
				m := filter.Matcher.Compare(silenceID, filter.Value)
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

func (filter *inhibitedByFilter) MatchAlertmanager(am *models.AlertmanagerInstance) bool {
	var isMatch bool
	for _, silenceID := range am.InhibitedBy {
		m := filter.Matcher.Compare(silenceID, filter.Value)
		if m {
			isMatch = m
		}
	}
	return isMatch
}

func newInhibitedByFilter() FilterT {
	f := inhibitedByFilter{}
	f.IsAlertmanagerFilter = true
	return &f
}

func inhibitedByAutocomplete(name string, operators []string, alerts []models.Alert) []models.Autocomplete {
	tokens := map[string]*models.Autocomplete{}
	for _, alert := range alerts {
		for _, am := range alert.Alertmanager {
			for _, silenceID := range am.InhibitedBy {
				for _, operator := range operators {
					token := fmt.Sprintf("%s%s%s", name, operator, silenceID)
					hint := makeAC(token, []string{
						name,
						strings.TrimPrefix(name, "@"),
						fmt.Sprintf("%s%s", name, operator),
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
