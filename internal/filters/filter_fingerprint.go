package filters

import (
	"github.com/prymitive/karma/internal/models"
)

type fingerprintFilter struct {
	filterBase
}

func (filter *fingerprintFilter) Match(alert *models.Alert, _ int) bool {
	var isMatch bool
	for _, am := range alert.Alertmanager {
		if filter.matcher.Compare(am.Fingerprint, filter.value) {
			isMatch = true
		}
	}
	if isMatch {
		filter.hits++
	}
	return isMatch
}

func (filter *fingerprintFilter) MatchAlertmanager(am *models.AlertmanagerInstance) bool {
	return filter.matcher.Compare(am.Fingerprint, filter.value)
}

func newFingerprintFilter(name, operator, rawText, value string) Filter {
	m, ok := buildMatcher(operator, value)
	if !ok {
		return &filterBase{rawText: rawText}
	}
	return &fingerprintFilter{
		filterBase: filterBase{
			matcher:              m,
			name:                 name,
			rawText:              rawText,
			value:                value,
			isValid:              true,
			isAlertmanagerFilter: true,
		},
	}
}
