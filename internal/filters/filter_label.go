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

func (filter *labelFilter) Match(alert *models.Alert, _ int) bool {
	if filter.IsValid {
		isMatch := filter.Matcher.Compare(alert.Labels.GetValue(filter.Matched), filter.Value)
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

func labelAutocomplete(_ string, operators []string, alerts []models.Alert) []models.Autocomplete {
	tokens := map[string]*models.Autocomplete{}
	for _, alert := range alerts {
		for _, l := range alert.Labels {
			for _, operator := range operators {
				switch operator {
				case equalOperator, notEqualOperator:
					token := fmt.Sprintf("%s%s%s", l.Name, operator, l.Value)
					hint := makeAC(
						token,
						[]string{
							l.Name,
							fmt.Sprintf("%s%s", l.Name, operator),
							l.Value,
						},
					)
					tokens[token] = &hint
				case regexpOperator, negativeRegexOperator:
					substrings := strings.Split(l.Value, " ")
					if len(substrings) > 1 {
						for _, substring := range substrings {
							token := fmt.Sprintf("%s%s%s", l.Name, operator, substring)
							hint := makeAC(
								token,
								[]string{
									l.Name,
									fmt.Sprintf("%s%s", l.Name, operator),
									l.Value,
									substring,
								},
							)
							tokens[token] = &hint
						}
					}
				case moreThanOperator, lessThanOperator:
					if _, err := strconv.Atoi(l.Value); err == nil {
						token := fmt.Sprintf("%s%s%s", l.Name, operator, l.Value)
						hint := makeAC(
							token,
							[]string{
								l.Name,
								fmt.Sprintf("%s%s", l.Name, operator),
								l.Value,
							},
						)
						tokens[token] = &hint
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
