package filters

import (
	"fmt"
	"strings"

	"github.com/prymitive/karma/internal/models"
)

type receiverFilter struct {
	value string
	alertFilter
}

func (filter *receiverFilter) init(name string, matcher *matcherT, rawText string, isValid bool, value string) {
	filter.Matched = name
	if matcher != nil {
		filter.Matcher = *matcher
	}
	filter.RawText = rawText
	filter.IsValid = isValid
	filter.value = value
}

func (filter *receiverFilter) GetValue() string {
	return filter.value
}

func (filter *receiverFilter) Match(alert *models.Alert, _ int) bool {
	if filter.IsValid {
		isMatch := filter.Matcher.Compare(alert.Receiver, filter.value)
		if isMatch {
			filter.Hits++
		}
		return isMatch
	}
	e := fmt.Sprintf("Match() called on invalid filter %#v", filter)
	panic(e)
}

func newreceiverFilter() FilterT {
	f := receiverFilter{}
	return &f
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
