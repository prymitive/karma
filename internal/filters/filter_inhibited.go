package filters

import (
	"strconv"
	"strings"

	"github.com/prymitive/karma/internal/models"
)

const (
	trueValue  = "true"
	falseValue = "false"
)

type inhibitedFilter struct {
	filterBase
	boolValue bool
}

func (filter *inhibitedFilter) Value() string {
	return strconv.FormatBool(filter.boolValue)
}

func (filter *inhibitedFilter) Match(alert *models.Alert, _ int) (isMatch bool) {
	for _, am := range alert.Alertmanager {
		if len(am.InhibitedBy) > 0 == filter.boolValue {
			isMatch = true
		}
	}
	if isMatch {
		filter.hits++
	}
	return isMatch
}

func (filter *inhibitedFilter) MatchAlertmanager(am *models.AlertmanagerInstance) bool {
	return len(am.InhibitedBy) > 0 == filter.boolValue
}

func newInhibitedFilter(name, operator, rawText, value string) Filter {
	var bv bool
	switch value {
	case trueValue:
		bv = true
	case falseValue:
		bv = false
	default:
		return &filterBase{rawText: rawText}
	}
	m, ok := buildMatcher(operator, value)
	if !ok {
		return &filterBase{rawText: rawText}
	}
	return &inhibitedFilter{
		filterBase: filterBase{
			matcher:              m,
			name:                 name,
			rawText:              rawText,
			value:                value,
			isValid:              true,
			isAlertmanagerFilter: true,
		},
		boolValue: bv,
	}
}

func inhibitedAutocomplete(name string, _ []string, _ []models.Alert, dst map[string]models.Autocomplete) {
	for _, val := range []string{trueValue, falseValue} {
		token := name + equalOperator + val
		setAC(dst, token, []string{
			name,
			strings.TrimPrefix(name, "@"),
			name + equalOperator,
			val,
		})
	}
}
