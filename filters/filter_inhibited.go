package filters

import (
	"fmt"
	"strings"

	"github.com/cloudflare/unsee/models"
)

type inhibitedFilter struct {
	alertFilter
}

func (filter *inhibitedFilter) init(name string, matcher *matcherT, rawText string, isValid bool, value string) {
	filter.Matched = name
	if matcher != nil {
		filter.Matcher = *matcher
	}
	filter.RawText = rawText
	filter.IsValid = isValid
	switch value {
	case "true":
		filter.Value = true
	case "false":
		filter.Value = false
	default:
		filter.IsValid = false
	}
}

func (filter *inhibitedFilter) Match(alert *models.Alert, matches int) bool {
	if filter.IsValid {
		isMatch := filter.Matcher.Compare(alert.IsInhibited(), filter.Value)
		if isMatch {
			filter.Hits++
		}
		return isMatch
	}
	e := fmt.Sprintf("Match() called on invalid filter %#v", filter)
	panic(e)
}

func newInhibitedFilter() FilterT {
	f := inhibitedFilter{}
	return &f
}

func inhibitedAutocomplete(name string, operators []string, alerts []models.Alert) []models.Autocomplete {
	tokens := []models.Autocomplete{}
	for _, operator := range operators {
		switch operator {
		case equalOperator:
			tokens = append(tokens, makeAC(
				fmt.Sprintf("%s%strue", name, operator),
				[]string{
					name,
					strings.TrimPrefix(name, "@"),
					fmt.Sprintf("%s%s", name, operator),
				},
			))
			tokens = append(tokens, makeAC(
				fmt.Sprintf("%s%sfalse", name, operator),
				[]string{
					name,
					strings.TrimPrefix(name, "@"),
					fmt.Sprintf("%s%s", name, operator),
				},
			))
		}
	}
	return tokens
}
