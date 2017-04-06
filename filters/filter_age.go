package filters

import (
	"fmt"
	"github.com/cloudflare/unsee/models"
	"strings"
	"time"
)

type ageFilter struct {
	alertFilter
}

func (filter *ageFilter) init(name string, matcher *matcherT, rawText string, isValid bool, value string) {
	filter.Matched = name
	if matcher != nil {
		filter.Matcher = *matcher
	}
	filter.RawText = rawText
	filter.IsValid = isValid

	dur, err := time.ParseDuration(value)
	if err != nil {
		filter.IsValid = false
	}
	if dur > 0 {
		filter.Value = -dur
	} else {
		filter.Value = dur
	}
}

func (filter *ageFilter) Match(alert *models.Alert, matches int) bool {
	if filter.IsValid {
		ts := time.Now().Add(filter.Value.(time.Duration))
		isMatch := filter.Matcher.Compare(int(ts.Unix()), int(alert.StartsAt.Unix()))
		if isMatch {
			filter.Hits++
		}
		return isMatch
	}
	e := fmt.Sprintf("Match() called on invalid filter %#v", filter)
	panic(e)
}

func newAgeFilter() FilterT {
	f := ageFilter{}
	return &f
}

func ageAutocomplete(name string, operators []string, alerts []models.Alert) []models.Autocomplete {
	tokens := []models.Autocomplete{}
	for _, operator := range operators {
		tokens = append(tokens, makeAC(
			fmt.Sprintf("%s%s10m", name, operator),
			[]string{
				name,
				strings.TrimPrefix(name, "@"),
				fmt.Sprintf("%s%s", name, operator),
			},
		))
		tokens = append(tokens, makeAC(
			fmt.Sprintf("%s%s1h", name, operator),
			[]string{
				name,
				strings.TrimPrefix(name, "@"),
				fmt.Sprintf("%s%s", name, operator),
			},
		))
	}
	return tokens
}
