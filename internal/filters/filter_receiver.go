package filters

import (
	"strings"

	"github.com/prymitive/karma/internal/models"
)

type receiverFilter struct {
	filterBase
}

func (filter *receiverFilter) Match(alert *models.Alert, _ int) bool {
	isMatch := filter.matcher.Compare(alert.Receiver, filter.value)
	if isMatch {
		filter.hits++
	}
	return isMatch
}

func newReceiverFilter(name, operator, rawText, value string) Filter {
	m, ok := buildMatcher(operator, value)
	if !ok {
		return &filterBase{rawText: rawText}
	}
	return &receiverFilter{
		filterBase: filterBase{
			matcher: m,
			name:    name,
			rawText: rawText,
			value:   value,
			isValid: true,
		},
	}
}

func receiverAutocomplete(name string, operators []string, alerts []models.Alert, dst map[string]models.Autocomplete) {
	for _, alert := range alerts {
		if alert.Receiver != "" {
			for _, operator := range operators {
				switch operator {
				case equalOperator, notEqualOperator:
					token := name + operator + alert.Receiver
					setAC(dst, token, []string{
						name,
						strings.TrimPrefix(name, "@"),
						name + operator,
					})
				case regexpOperator, negativeRegexOperator:
					if strings.Contains(alert.Receiver, " ") {
						for substring := range strings.SplitSeq(alert.Receiver, " ") {
							token := name + operator + substring
							setAC(dst, token, []string{
								name,
								strings.TrimPrefix(name, "@"),
								name + operator,
								substring,
							})
						}
					}
				}
			}
		}
	}
}
