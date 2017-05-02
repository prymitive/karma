package filters

import (
	"fmt"
	"strings"

	"github.com/cloudflare/unsee/models"
	"github.com/cloudflare/unsee/store"
)

type silenceJiraFilter struct {
	alertFilter
}

func (filter *silenceJiraFilter) Match(alert *models.Alert, matches int) bool {
	if filter.IsValid {
		var isMatch bool
		if alert.IsSilenced() {
			for _, silenceID := range alert.SilencedBy {
				if silence := store.Store.GetSilence(silenceID); silence != nil {
					isMatch = filter.Matcher.Compare(silence.JiraID, filter.Value)
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

func newSilenceJiraFilter() FilterT {
	f := silenceJiraFilter{}
	return &f
}

func sinceJiraIDAutocomplete(name string, operators []string, alerts []models.Alert) []models.Autocomplete {
	tokens := map[string]models.Autocomplete{}
	for _, alert := range alerts {
		if alert.IsSilenced() {
			for _, silenceID := range alert.SilencedBy {
				silence := store.Store.GetSilence(silenceID)
				if silence != nil && silence.JiraID != "" {
					for _, operator := range operators {
						token := fmt.Sprintf("%s%s%s", name, operator, silence.JiraID)
						tokens[token] = makeAC(token, []string{
							name,
							strings.TrimPrefix(name, "@"),
							fmt.Sprintf("%s%s", name, operator),
							silence.JiraID,
						})
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
