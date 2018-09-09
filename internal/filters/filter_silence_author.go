package filters

import (
	"fmt"
	"strings"

	"github.com/prymitive/karma/internal/models"
)

type silenceAuthorFilter struct {
	alertFilter
}

func (filter *silenceAuthorFilter) Match(alert *models.Alert, matches int) bool {
	if filter.IsValid {
		var isMatch bool
		if alert.IsSilenced() {
			for _, silenceID := range alert.SilencedBy {
				for _, am := range alert.Alertmanager {
					silence, found := am.Silences[silenceID]
					if found {
						m := filter.Matcher.Compare(silence.CreatedBy, filter.Value)
						if m {
							isMatch = m
						}
					}
				}
			}
		} else {
			isMatch = filter.Matcher.Compare("", filter.Value)
		}
		if isMatch {
			filter.Hits++
		}
		return isMatch
	}
	e := fmt.Sprintf("Match() called on invalid filter %#v", filter)
	panic(e)
}

func newSilenceAuthorFilter() FilterT {
	f := silenceAuthorFilter{}
	return &f
}

func sinceAuthorAutocomplete(name string, operators []string, alerts []models.Alert) []models.Autocomplete {
	tokens := map[string]models.Autocomplete{}
	for _, alert := range alerts {
		if alert.IsSilenced() {
			for _, silenceID := range alert.SilencedBy {
				for _, am := range alert.Alertmanager {
					silence, found := am.Silences[silenceID]
					if found {
						for _, operator := range operators {
							token := fmt.Sprintf("%s%s%s", name, operator, silence.CreatedBy)
							tokens[token] = makeAC(token, []string{
								name,
								strings.TrimPrefix(name, "@"),
								fmt.Sprintf("%s%s", name, operator),
								silence.CreatedBy,
							})
						}
					}
				}
			}
		}
	}
	acData := []models.Autocomplete{}
	for _, token := range tokens {
		acData = append(acData, token)
	}
	return acData
}
