package filters

import (
	"fmt"
	"strings"

	"github.com/prymitive/karma/internal/models"
)

type silenceAuthorFilter struct {
	alertFilter
}

func (filter *silenceAuthorFilter) Match(alert *models.Alert, _ int) bool {
	if filter.IsValid {
		var isMatch bool
		for _, am := range alert.Alertmanager {
			for _, silenceID := range am.SilencedBy {
				silence, found := am.Silences[silenceID]
				if found {
					m := filter.Matcher.Compare(silence.CreatedBy, filter.Value)
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
			m := filter.Matcher.Compare(silence.CreatedBy, filter.Value)
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

func silenceAuthorAutocomplete(name string, operators []string, alerts []models.Alert) []models.Autocomplete {
	tokens := map[string]*models.Autocomplete{}
	for _, alert := range alerts {
		for _, am := range alert.Alertmanager {
			for _, silenceID := range am.SilencedBy {
				for _, am := range alert.Alertmanager {
					silence, found := am.Silences[silenceID]
					if found {
						for _, operator := range operators {
							token := fmt.Sprintf("%s%s%s", name, operator, silence.CreatedBy)
							hint := makeAC(token, []string{
								name,
								strings.TrimPrefix(name, "@"),
								fmt.Sprintf("%s%s", name, operator),
								silence.CreatedBy,
							})
							tokens[token] = &hint
						}
					}
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
