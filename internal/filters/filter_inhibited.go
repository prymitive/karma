package filters

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/prymitive/karma/internal/models"
)

const (
	trueValue  = "true"
	falseValue = "false"
)

type inhibitedFilter struct {
	alertFilter
	value bool
}

func (filter *inhibitedFilter) init(name string, matcher *matcherT, rawText string, isValid bool, value string) {
	filter.Matched = name
	if matcher != nil {
		filter.Matcher = *matcher
	}
	filter.RawText = rawText
	filter.IsValid = isValid
	switch value {
	case trueValue:
		filter.value = true
	case falseValue:
		filter.value = false
	default:
		filter.IsValid = false
	}
}

func (filter *inhibitedFilter) GetValue() string {
	return strconv.FormatBool(filter.value)
}

func (filter *inhibitedFilter) Match(alert *models.Alert, _ int) (isMatch bool) {
	if filter.IsValid {
		for _, am := range alert.Alertmanager {
			if len(am.InhibitedBy) > 0 == filter.value {
				isMatch = true
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

func (filter *inhibitedFilter) MatchAlertmanager(am *models.AlertmanagerInstance) bool {
	return len(am.InhibitedBy) > 0 == filter.value
}

func newInhibitedFilter() FilterT {
	f := inhibitedFilter{}
	f.IsAlertmanagerFilter = true
	return &f
}

func inhibitedAutocomplete(name string, _ []string, _ []models.Alert) []models.Autocomplete {
	tokens := map[string]*models.Autocomplete{}

	for _, val := range []string{trueValue, falseValue} {
		token := name + equalOperator + val
		hint := makeAC(token, []string{
			name,
			strings.TrimPrefix(name, "@"),
			name + equalOperator,
			val,
		})
		tokens[token] = &hint
	}
	acData := make([]models.Autocomplete, 0, len(tokens))
	for _, token := range tokens {
		acData = append(acData, *token)
	}
	return acData
}
