package filters

import (
	"fmt"

	"github.com/prymitive/karma/internal/models"
)

type fingerprintFilter struct {
	alertFilter
}

func (filter *fingerprintFilter) Match(alert *models.Alert, _ int) bool {
	if filter.IsValid {
		var isMatch bool
		for _, am := range alert.Alertmanager {
			m := filter.Matcher.Compare(am.Fingerprint, filter.Value)
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
	return filter.Matcher.Compare(am.Fingerprint, filter.Value)
}

func newFingerprintFilter() FilterT {
	f := fingerprintFilter{}
	f.IsAlertmanagerFilter = true
	return &f
}
