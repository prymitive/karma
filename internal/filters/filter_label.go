package filters

import (
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
	filterBase
}

func (filter *labelFilter) Match(alert *models.Alert, _ int) bool {
	isMatch := filter.matcher.Compare(alert.Labels.Get(filter.name), filter.value)
	if isMatch {
		filter.hits++
	}
	return isMatch
}

func newLabelFilter(name, operator, rawText, value string) Filter {
	m, ok := buildMatcher(operator, value)
	if !ok {
		return &filterBase{rawText: rawText}
	}
	return &labelFilter{
		filterBase: filterBase{
			matcher: m,
			name:    name,
			rawText: rawText,
			value:   value,
			isValid: true,
		},
	}
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
