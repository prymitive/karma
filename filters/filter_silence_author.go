package filters

import (
	"fmt"
	"strconv"
	"strings"
	"github.com/cloudflare/unsee/models"
	"github.com/cloudflare/unsee/store"
)

type silenceAuthorFilter struct {
	alertFilter
}

func (filter *silenceAuthorFilter) Match(alert *models.UnseeAlert, matches int) bool {
	if filter.IsValid {
		var isMatch bool
		if alert.Silenced > 0 {
			store.StoreLock.RLock()
			if silence, found := store.SilenceStore.Store[strconv.Itoa(alert.Silenced)]; found {
				isMatch = filter.Matcher.Compare(filter.Value, silence.CreatedBy)
			}
			store.StoreLock.RUnlock()
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

func sinceAuthorAutocomplete(name string, operators []string, alerts []models.UnseeAlert) []models.UnseeAutocomplete {
	tokens := map[string]models.UnseeAutocomplete{}
	for _, alert := range alerts {
		if alert.Silenced > 0 {
			store.StoreLock.RLock()
			if silence, found := store.SilenceStore.Store[strconv.Itoa(alert.Silenced)]; found && silence.CreatedBy != "" {
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
			store.StoreLock.RUnlock()
		}
	}
	acData := []models.UnseeAutocomplete{}
	for _, token := range tokens {
		acData = append(acData, token)
	}
	return acData
}
