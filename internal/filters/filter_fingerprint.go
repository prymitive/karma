package filters

import (
	"fmt"

	"github.com/prymitive/karma/internal/models"
)

type fingerprintFilter struct {
	alertFilter
	value string
}

func (filter *fingerprintFilter) init(name string, matcher *matcherT, rawText string, isValid bool, value string) {
	filter.Matched = name
	if matcher != nil {
		filter.Matcher = *matcher
	}
	filter.RawText = rawText
	filter.IsValid = isValid
	filter.value = value
}

func (filter *fingerprintFilter) GetValue() string {
	return filter.value
}

func (filter *fingerprintFilter) Match(alert *models.Alert, _ int) bool {
	if filter.IsValid {
		var isMatch bool
		for _, am := range alert.Alertmanager {
			m := filter.Matcher.Compare(am.Fingerprint, filter.value)
			if m {
				isMatch = m
			}
		}
		if isMatch {
			filter.Hits++
		}
		return isMatch
	}
	e := fmt.Sprintf("Match() called on invalid filter %#v", filter)
	panic(e)
}

func (filter *fingerprintFilter) MatchAlertmanager(am *models.AlertmanagerInstance) bool {
	return filter.Matcher.Compare(am.Fingerprint, filter.value)
}

func newFingerprintFilter() FilterT {
	f := fingerprintFilter{}
	f.IsAlertmanagerFilter = true
	return &f
}
