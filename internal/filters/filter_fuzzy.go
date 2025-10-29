package filters

import (
	"fmt"
	"regexp"

	"github.com/prymitive/karma/internal/models"
)

type fuzzyFilter struct {
	alertFilter
	value *regexp.Regexp
}

func (filter *fuzzyFilter) init(name string, matcher *matcherT, rawText string, isValid bool, value string) {
	filter.Matched = name
	if matcher != nil {
		filter.Matcher = *matcher
	}
	filter.RawText = rawText
	filter.IsValid = isValid
	var err error
	if filter.value, err = regexp.Compile("(?i)" + value); err != nil {
		filter.IsValid = false
	}
}

func (filter *fuzzyFilter) GetValue() string {
	return fmt.Sprintf("%v", filter.value)
}

func (filter *fuzzyFilter) Match(alert *models.Alert, _ int) bool {
	if filter.IsValid {
		for _, val := range alert.Annotations {
			if filter.value.MatchString(val.Value.Value()) {
				filter.Hits++
				return true
			}
		}

		for _, l := range alert.Labels {
			if filter.value.MatchString(l.Value.Value()) {
				filter.Hits++
				return true
			}
		}

		for _, silenceID := range alert.SilencedBy {
			for _, am := range alert.Alertmanager {
				silence, found := am.Silences[silenceID]
				if found {
					if filter.value.MatchString(silence.Comment) {
						filter.Hits++
						return true
					}
				}
			}
		}

		return false

	}
	e := fmt.Sprintf("Match() called on invalid filter %#v", filter)
	panic(e)
}

func newFuzzyFilter() FilterT {
	f := fuzzyFilter{}
	return &f
}
