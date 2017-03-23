package filters

import (
	"fmt"
	"strconv"
	"strings"
	"github.com/cloudflare/unsee/models"
)

type limitFilter struct {
	alertFilter
}

func (filter *limitFilter) init(name string, matcher *matcherT, rawText string, isValid bool, value string) {
	filter.Matched = name
	if matcher != nil {
		filter.Matcher = *matcher
	}
	filter.RawText = rawText
	filter.IsValid = isValid
	if filter.IsValid {
		val, err := strconv.Atoi(value)
		if err != nil || val < 1 {
			filter.IsValid = false
		} else {
			filter.Value = val
		}
	}
}

func (filter *limitFilter) Match(alert *models.UnseeAlert, matches int) bool {
	if filter.IsValid {
		if matches < filter.Value.(int) {
			return true
		}
		filter.Hits++
		return false
	}
	e := fmt.Sprintf("Match() called on invalid filter %#v", filter)
	panic(e)
}

func newLimitFilter() FilterT {
	f := limitFilter{}
	return &f
}

func limitAutocomplete(name string, operators []string, alerts []models.UnseeAlert) []models.UnseeAutocomplete {
	tokens := []models.UnseeAutocomplete{}
	for _, operator := range operators {
		tokens = append(tokens, makeAC(
			fmt.Sprintf("%s%s10", name, operator),
			[]string{
				name,
				strings.TrimPrefix(name, "@"),
				fmt.Sprintf("%s%s", name, operator),
			},
		))
		tokens = append(tokens, makeAC(
			fmt.Sprintf("%s%s50", name, operator),
			[]string{
				name,
				strings.TrimPrefix(name, "@"),
				fmt.Sprintf("%s%s", name, operator),
			},
		))
	}
	return tokens
}
