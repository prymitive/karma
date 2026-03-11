package filters

import (
	"errors"
	"regexp"
	"strconv"
)

// Matcher holds the comparison operator and its implementation.
type Matcher struct {
	Operator string
	Compare  func(a, b string) bool
}

func compareEqual(a, b string) bool    { return a == b }
func compareNotEqual(a, b string) bool { return a != b }

func compareMoreThan(a, b string) bool {
	if a == "" || b == "" {
		return false
	}
	intA, okA := tryAtoi(a)
	intB, okB := tryAtoi(b)
	if okA && okB {
		return intA > intB
	}
	return a > b
}

func compareLessThan(a, b string) bool {
	if a == "" || b == "" {
		return false
	}
	intA, okA := tryAtoi(a)
	intB, okB := tryAtoi(b)
	if okA && okB {
		return intA < intB
	}
	return a < b
}

func compareRegexp(re *regexp.Regexp) func(a, _ string) bool {
	return func(a, _ string) bool {
		return re.MatchString(a)
	}
}

func compareNegativeRegexp(re *regexp.Regexp) func(a, _ string) bool {
	return func(a, _ string) bool {
		return !re.MatchString(a)
	}
}

func newMatcher(operator string) (Matcher, error) {
	switch operator {
	case equalOperator:
		return Matcher{Operator: operator, Compare: compareEqual}, nil
	case notEqualOperator:
		return Matcher{Operator: operator, Compare: compareNotEqual}, nil
	case moreThanOperator:
		return Matcher{Operator: operator, Compare: compareMoreThan}, nil
	case lessThanOperator:
		return Matcher{Operator: operator, Compare: compareLessThan}, nil
	case regexpOperator, negativeRegexOperator:
		// regex matchers need the pattern to compile, which is not known here.
		// Return a placeholder; the caller must call newRegexpMatcher instead.
		return Matcher{Operator: operator}, nil
	}
	return Matcher{}, errors.New(operator + " not matched with any known match type")
}

// newRegexpMatcher compiles pattern once and returns a Matcher that uses it.
func newRegexpMatcher(operator, pattern string) (Matcher, error) {
	re, err := regexp.Compile("(?i)" + pattern)
	if err != nil {
		return Matcher{}, err
	}
	if operator == negativeRegexOperator {
		return Matcher{Operator: operator, Compare: compareNegativeRegexp(re)}, nil
	}
	return Matcher{Operator: operator, Compare: compareRegexp(re)}, nil
}

func tryAtoi(s string) (int, bool) {
	if v, err := strconv.Atoi(s); err == nil {
		return v, true
	}
	return 0, false
}
