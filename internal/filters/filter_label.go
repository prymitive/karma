package filters

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/prymitive/karma/internal/models"
)

type labelFilter struct {
	alertFilter
}

func (filter *labelFilter) Match(alert *models.Alert, matches int) bool {
	if filter.IsValid {
		isMatch := filter.Matcher.Compare(alert.Labels[filter.Matched], filter.Value)
		if isMatch {
			filter.Hits++
		}
		return isMatch
	}
	e := fmt.Sprintf("Match() called on invalid filter %#v", filter)
	panic(e)
}

func newLabelFilter() FilterT {
	f := labelFilter{}
	return &f
}

func labelAutocomplete(name string, operators []string, alerts []models.Alert) []models.Autocomplete {
	tokens := map[string]models.Autocomplete{}
	for _, alert := range alerts {
		for key, value := range alert.Labels {
			for _, operator := range operators {
				switch operator {
				case equalOperator, notEqualOperator:
					token := fmt.Sprintf("%s%s%s", key, operator, value)
					tokens[token] = makeAC(
						token,
						[]string{
							key,
							fmt.Sprintf("%s%s", key, operator),
							value,
						},
					)
				case regexpOperator, negativeRegexOperator:
					substrings := strings.Split(value, " ")
					if len(substrings) > 1 {
						for _, substring := range substrings {
							token := fmt.Sprintf("%s%s%s", key, operator, substring)
							tokens[token] = makeAC(
								token,
								[]string{
									key,
									fmt.Sprintf("%s%s", key, operator),
									value,
									substring,
								},
							)
						}
					}
				case moreThanOperator, lessThanOperator:
					if _, err := strconv.Atoi(value); err == nil {
						token := fmt.Sprintf("%s%s%s", key, operator, value)
						tokens[token] = makeAC(
							token,
							[]string{
								key,
								fmt.Sprintf("%s%s", key, operator),
								value,
							},
						)
					}
				}
			}
		}
	}
	acData := make([]models.Autocomplete, 0, len(tokens))
	for _, token := range tokens {
		acData = append(acData, token)
	}
	return acData
}
