package filters

import (
	"fmt"
	"strings"

	"github.com/prymitive/karma/internal/models"
)

type silenceIDFilter struct {
	alertFilter
}

func (filter *silenceIDFilter) Match(alert *models.Alert, matches int) bool {
	if filter.IsValid {
		var isMatch bool
		if alert.IsSilenced() {
			for _, silenceID := range alert.SilencedBy {
				m := filter.Matcher.Compare(silenceID, filter.Value)
				if m {
					isMatch = m
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

func newsilenceIDFilter() FilterT {
	f := silenceIDFilter{}
	return &f
}

func silenceIDAutocomplete(name string, operators []string, alerts []models.Alert) []models.Autocomplete {
	tokens := map[string]models.Autocomplete{}
	for _, alert := range alerts {
		if alert.IsSilenced() {
			for _, silenceID := range alert.SilencedBy {
				for _, operator := range operators {
					token := fmt.Sprintf("%s%s%s", name, operator, silenceID)
					tokens[token] = makeAC(token, []string{
						name,
						strings.TrimPrefix(name, "@"),
						fmt.Sprintf("%s%s", name, operator),
						silenceID,
					})
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
