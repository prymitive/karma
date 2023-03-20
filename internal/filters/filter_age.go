package filters

import (
	"fmt"
	"strings"
	"time"

	"github.com/prymitive/karma/internal/models"
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

func (filter *ageFilter) Match(alert *models.Alert, _ int) bool {
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

func (filter *ageFilter) MatchAlertmanager(am *models.AlertmanagerInstance) bool {
	ts := time.Now().Add(filter.Value.(time.Duration))
	return filter.Matcher.Compare(int(ts.Unix()), int(am.StartsAt.Unix()))
}

func newAgeFilter() FilterT {
	f := ageFilter{}
	f.IsAlertmanagerFilter = true
	return &f
}

func ageAutocomplete(name string, operators []string, _ []models.Alert) []models.Autocomplete {
	tokens := make([]models.Autocomplete, 0, len(operators)*2)
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
