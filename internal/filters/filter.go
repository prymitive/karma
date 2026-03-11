package filters

import (
	"fmt"
	"regexp"
	"slices"
	"strings"

	"github.com/prymitive/karma/internal/models"
)

// Filter provides methods for interacting with alert filters.
type Filter interface {
	Match(alert *models.Alert, matches int) bool
	MatchAlertmanager(am *models.AlertmanagerInstance) bool
	RawText() string
	Hits() int
	Valid() bool
	Name() string
	MatcherOperation() string
	Value() string
	IsAlertmanagerFilter() bool
}

// filterBase holds common state shared by all filter implementations.
// Concrete filters embed this struct and override Match and optionally
// MatchAlertmanager and Value.
type filterBase struct {
	matcher              Matcher
	name                 string
	rawText              string
	value                string
	hits                 int
	isValid              bool
	isAlertmanagerFilter bool
}

func (f *filterBase) RawText() string            { return f.rawText }
func (f *filterBase) Hits() int                  { return f.hits }
func (f *filterBase) Valid() bool                { return f.isValid }
func (f *filterBase) Name() string               { return f.name }
func (f *filterBase) Value() string              { return f.value }
func (f *filterBase) IsAlertmanagerFilter() bool { return f.isAlertmanagerFilter }
func (f *filterBase) MatcherOperation() string   { return f.matcher.Operator }

func (f *filterBase) Match(*models.Alert, int) bool                       { return false }
func (f *filterBase) MatchAlertmanager(*models.AlertmanagerInstance) bool { return false }

// buildMatcher creates a Matcher for the given operator and value.
// For regex operators it compiles the pattern; for others it delegates to newMatcher.
func buildMatcher(operator, value string) (Matcher, bool) {
	switch operator {
	case regexpOperator, negativeRegexOperator:
		m, err := newRegexpMatcher(operator, value)
		if err != nil {
			return Matcher{}, false
		}
		return m, true
	default:
		m, err := newMatcher(operator)
		if err != nil {
			return Matcher{}, false
		}
		return m, true
	}
}

// NewFilter creates a new filter from a filter expression like "key=value".
// The expression is parsed and the best filter implementation and value
// matcher are selected.
func NewFilter(expression string) Filter {
	trimmed := strings.Trim(expression, " \t")

	if trimmed == "" {
		return &filterBase{rawText: trimmed}
	}

	reExp := fmt.Sprintf("^(?P<matched>(%s))(?P<operator>(%s))(?P<value>(.*))", filterRegex, matcherRegex)
	re := regexp.MustCompile(reExp)
	match := re.FindStringSubmatch(trimmed)
	result := make(map[string]string)
	for i, name := range re.SubexpNames() {
		if name != "" && i > 0 && i <= len(match) {
			result[name] = match[i]
		}
	}

	matched := result["matched"]
	operator := result["operator"]
	value := result["value"]

	if matched == "" && operator == "" && value == "" {
		return newFuzzyFilter(trimmed)
	}

	if value == "" {
		return &filterBase{rawText: trimmed}
	}

	for _, fc := range AllFilters {
		if !fc.LabelRe.MatchString(matched) {
			continue
		}
		if !slices.Contains(fc.SupportedOperators, operator) {
			return &filterBase{rawText: trimmed}
		}
		return fc.Factory(matched, operator, trimmed, value)
	}

	return &filterBase{rawText: trimmed}
}
