package filters

import (
	"fmt"
	"strings"

	"github.com/prometheus/prometheus/model/labels"

	"github.com/prymitive/karma/internal/models"
)

func isDigits(s string) bool {
	if s == "" {
		return false
	}
	for i := range len(s) {
		c := s[i]
		if c < '0' || c > '9' {
			if i == 0 && (c == '+' || c == '-') && len(s) > 1 {
				continue
			}
			return false
		}
	}
	return true
}

type labelFilter struct {
	value string
	alertFilter
}

func (filter *labelFilter) init(name string, matcher *matcherT, rawText string, isValid bool, value string) {
	filter.Matched = name
	if matcher != nil {
		filter.Matcher = *matcher
	}
	filter.RawText = rawText
	filter.IsValid = isValid
	filter.value = value
}

func (filter *labelFilter) GetValue() string {
	return filter.value
}

func (filter *labelFilter) Match(alert *models.Alert, _ int) bool {
	if filter.IsValid {
		isMatch := filter.Matcher.Compare(alert.Labels.Get(filter.Matched), filter.value)
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

func LabelAutocomplete(labelPairs [][]labels.Label, dst map[string]models.Autocomplete) {
	var b strings.Builder
	for _, pairs := range labelPairs {
		for _, l := range pairs {
			for _, operator := range labelFilterOperators {
				switch operator {
				case equalOperator, notEqualOperator:
					b.Reset()
					b.Grow(len(l.Name) + len(operator) + len(l.Value))
					b.WriteString(l.Name)
					b.WriteString(operator)
					b.WriteString(l.Value)
					token := b.String()
					setAC(dst, token, []string{
						l.Name,
						l.Name + operator,
						l.Value,
					})
				case regexpOperator, negativeRegexOperator:
					if strings.Contains(l.Value, " ") {
						for substring := range strings.SplitSeq(l.Value, " ") {
							b.Reset()
							b.Grow(len(l.Name) + len(operator) + len(substring))
							b.WriteString(l.Name)
							b.WriteString(operator)
							b.WriteString(substring)
							token := b.String()
							setAC(dst, token, []string{
								l.Name,
								l.Name + operator,
								l.Value,
								substring,
							})
						}
					}
				case moreThanOperator, lessThanOperator:
					if isDigits(l.Value) {
						b.Reset()
						b.Grow(len(l.Name) + len(operator) + len(l.Value))
						b.WriteString(l.Name)
						b.WriteString(operator)
						b.WriteString(l.Value)
						token := b.String()
						setAC(dst, token, []string{
							l.Name,
							l.Name + operator,
							l.Value,
						})
					}
				}
			}
		}
	}
}

var labelFilterOperators = []string{regexpOperator, negativeRegexOperator, equalOperator, notEqualOperator, lessThanOperator, moreThanOperator}
