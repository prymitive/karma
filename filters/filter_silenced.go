package filters

import (
	"fmt"
	"strings"
	"github.com/cloudflare/unsee/models"
)

type silencedFilter struct {
	alertFilter
}

func (filter *silencedFilter) init(name string, matcher *matcherT, rawText string, isValid bool, value string) {
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

func (filter *silencedFilter) Match(alert *models.UnseeAlert, matches int) bool {
	if filter.IsValid {
		var isSilenced bool
		isSilenced = (alert.Silenced > 0)
		isMatch := filter.Matcher.Compare(isSilenced, filter.Value)
		if isMatch {
			filter.Hits++
		}
		return isMatch
	}
	e := fmt.Sprintf("Match() called on invalid filter %#v", filter)
	panic(e)
}

func newSilencedFilter() FilterT {
	f := silencedFilter{}
	return &f
}

func silencedAutocomplete(name string, operators []string, alerts []models.UnseeAlert) []models.UnseeAutocomplete {
	tokens := []models.UnseeAutocomplete{}
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
