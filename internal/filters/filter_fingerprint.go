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
	// operator is pre-validated by the registry, buildMatcher cannot fail here
	m, _ := buildMatcher(operator, value)
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
