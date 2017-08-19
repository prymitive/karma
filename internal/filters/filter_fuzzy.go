package filters

import (
	"fmt"
	"regexp"

	"github.com/cloudflare/unsee/internal/models"
)

type fuzzyFilter struct {
	alertFilter
}

func (filter *fuzzyFilter) init(name string, matcher *matcherT, rawText string, isValid bool, value string) {
	filter.Matched = name
	if matcher != nil {
		filter.Matcher = *matcher
	}
	filter.RawText = rawText
	filter.IsValid = isValid
	filter.Value = value
	if _, err := regexp.Compile(value); err != nil {
		filter.IsValid = false
	}
}

func (filter *fuzzyFilter) Match(alert *models.Alert, matches int) bool {
	if filter.IsValid {
		for _, val := range alert.Annotations {
			if filter.Matcher.Compare(val.Value, filter.Value) {
				filter.Hits++
				return true
			}
		}

		for _, val := range alert.Labels {
			if filter.Matcher.Compare(val, filter.Value) {
				filter.Hits++
				return true
			}
		}

		for _, silenceID := range alert.SilencedBy {
			for _, am := range alert.Alertmanager {
				silence, found := am.Silences[silenceID]
				if found {
					m := filter.Matcher.Compare(silence.Comment, filter.Value)
					if m {
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
