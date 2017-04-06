package filters

import (
	"fmt"
	"strings"

	"github.com/cloudflare/unsee/models"
	"github.com/cloudflare/unsee/store"
)

type silenceAuthorFilter struct {
	alertFilter
}

func (filter *silenceAuthorFilter) Match(alert *models.Alert, matches int) bool {
	if filter.IsValid {
		var isMatch bool
		if alert.Silenced != "" {
			if silence := store.Store.GetSilence(alert.Silenced); silence != nil {
				isMatch = filter.Matcher.Compare(filter.Value, silence.CreatedBy)
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
		if alert.Silenced != "" {
			if silence := store.Store.GetSilence(alert.Silenced); silence != nil {
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
	acData := []models.Autocomplete{}
	for _, token := range tokens {
		acData = append(acData, token)
	}
	return acData
}
