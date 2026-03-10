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

func receiverAutocomplete(name string, operators []string, alerts []models.Alert) []models.Autocomplete {
	tokens := map[string]*models.Autocomplete{}
	for _, alert := range alerts {
		if alert.Receiver != "" {
			for _, operator := range operators {
				switch operator {
				case equalOperator, notEqualOperator:
					token := name + operator + alert.Receiver
					if _, ok := tokens[token]; !ok {
						hint := makeAC(
							token,
							[]string{
								name,
								strings.TrimPrefix(name, "@"),
								name + operator,
							},
						)
						tokens[token] = &hint
					}
				case regexpOperator, negativeRegexOperator:
					substrings := strings.Split(alert.Receiver, " ")
					if len(substrings) > 1 {
						for _, substring := range substrings {
							token := name + operator + substring
							if _, ok := tokens[token]; !ok {
								hint := makeAC(
									token,
									[]string{
										name,
										strings.TrimPrefix(name, "@"),
										name + operator,
										substring,
									},
								)
								tokens[token] = &hint
							}
						}
					}
				}
			}
		}
	}
	acData := make([]models.Autocomplete, 0, len(tokens))
	for _, token := range tokens {
		acData = append(acData, *token)
	}
	return acData
}
