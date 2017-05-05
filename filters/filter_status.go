package filters

import (
	"fmt"
	"strings"

	"github.com/cloudflare/unsee/models"
)

type statusFilter struct {
	alertFilter
}

func (filter *statusFilter) init(name string, matcher *matcherT, rawText string, isValid bool, value string) {
	filter.Matched = name
	if matcher != nil {
		filter.Matcher = *matcher
	}
	filter.RawText = rawText
	filter.IsValid = isValid
	filter.Value = value
	if !stringInSlice(models.AlertStateList, value) {
		filter.IsValid = false
	}
}

func (filter *statusFilter) Match(alert *models.Alert, matches int) bool {
	if filter.IsValid {
		isMatch := filter.Matcher.Compare(alert.Status, filter.Value)
		if isMatch {
			filter.Hits++
		}
		return isMatch
	}
	e := fmt.Sprintf("Match() called on invalid filter %#v", filter)
	panic(e)
}

func newstatusFilter() FilterT {
	f := statusFilter{}
	return &f
}

func statusAutocomplete(name string, operators []string, alerts []models.Alert) []models.Autocomplete {
	tokens := []models.Autocomplete{}
	for _, operator := range operators {
		for _, alert := range alerts {
			tokens = append(tokens, makeAC(
				name+operator+alert.Status,
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
