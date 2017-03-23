package filters

import (
	"fmt"
	"regexp"
	"strconv"
	"github.com/cloudflare/unsee/models"
	"github.com/cloudflare/unsee/store"
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

func (filter *fuzzyFilter) Match(alert *models.UnseeAlert, matches int) bool {
	if filter.IsValid {
		for _, val := range alert.Annotations {
			if filter.Matcher.Compare(val, filter.Value) {
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

		if alert.Silenced > 0 {
			if silence, found := store.SilenceStore.Store[strconv.Itoa(alert.Silenced)]; found {
				if filter.Matcher.Compare(silence.Comment, filter.Value) {
					filter.Hits++
					return true
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
