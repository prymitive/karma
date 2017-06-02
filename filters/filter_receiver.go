package filters

import (
	"fmt"
	"strings"

	"github.com/cloudflare/unsee/models"
)

type receiverFilter struct {
	alertFilter
}

func (filter *receiverFilter) Match(alert *models.Alert, matches int) bool {
	if filter.IsValid {
		isMatch := filter.Matcher.Compare(alert.Receiver, filter.Value)
		if isMatch {
			filter.Hits++
		}
		return isMatch
	}
	e := fmt.Sprintf("Match() called on invalid filter %#v", filter)
	panic(e)
}

func newreceiverFilter() FilterT {
	f := receiverFilter{}
	return &f
}

func receiverAutocomplete(name string, operators []string, alerts []models.Alert) []models.Autocomplete {
	tokens := []models.Autocomplete{}
	for _, operator := range operators {
		for _, alert := range alerts {
			tokens = append(tokens, makeAC(
				name+operator+alert.Receiver,
				[]string{
					name,
					strings.TrimPrefix(name, "@"),
					name + operator,
				},
			))
		}
	}
	return tokens
}
