package filters

import (
	"testing"
)

type matchTest struct {
	ValA     string
	ValB     string
	Expected bool
}

func TestEqualMatcher(t *testing.T) {
	tests := []matchTest{
		// identical strings match
		{"a", "a", true},
		{"abc", "abc", true},
		// different strings do not match
		{"a", "ab", false},
		{"1", "2", false},
	}
	for _, mt := range tests {
		if result := compareEqual(mt.ValA, mt.ValB); result != mt.Expected {
			t.Errorf("compareEqual(%q, %q) = %v, want %v", mt.ValA, mt.ValB, result, mt.Expected)
		}
	}
}

func TestNotEqualMatcher(t *testing.T) {
	tests := []matchTest{
		// identical strings do not match
		{"a", "a", false},
		{"abc", "abc", false},
		// different strings match
		{"a", "ab", true},
		{"1", "2", true},
	}
	for _, mt := range tests {
		if result := compareNotEqual(mt.ValA, mt.ValB); result != mt.Expected {
			t.Errorf("compareNotEqual(%q, %q) = %v, want %v", mt.ValA, mt.ValB, result, mt.Expected)
		}
	}
}

func TestMoreThanMatcher(t *testing.T) {
	tests := []matchTest{
		// numeric comparison
		{"10", "1", true},
		{"8", "8", false},
		{"4", "9", false},
		// string comparison when non-numeric
		{"b", "a", true},
		{"a", "a", false},
		{"a", "b", false},
		// empty strings return false
		{"", "", false},
		{"1", "", false},
		{"", "1", false},
	}
	for _, mt := range tests {
		if result := compareMoreThan(mt.ValA, mt.ValB); result != mt.Expected {
			t.Errorf("compareMoreThan(%q, %q) = %v, want %v", mt.ValA, mt.ValB, result, mt.Expected)
		}
	}
}

func TestLessThanMatcher(t *testing.T) {
	tests := []matchTest{
		// numeric comparison
		{"10", "1", false},
		{"8", "8", false},
		{"4", "9", true},
		// string comparison when non-numeric
		{"b", "a", false},
		{"a", "a", false},
		{"a", "b", true},
		// empty strings return false
		{"", "", false},
		{"1", "", false},
		{"", "1", false},
	}
	for _, mt := range tests {
		if result := compareLessThan(mt.ValA, mt.ValB); result != mt.Expected {
			t.Errorf("compareLessThan(%q, %q) = %v, want %v", mt.ValA, mt.ValB, result, mt.Expected)
		}
	}
}

func TestRegexpMatcher(t *testing.T) {
	tests := []matchTest{
		// matching patterns
		{"abcdef", "^abc", true},
		{"abc", "^abc", true},
		{"xxabcxx", "abc", true},
		{"123", "123", true},
		{"5", "^[0-9]+", true},
		// non-matching patterns
		{"xb", "abc", false},
		{"13", "12", false},
	}
	for _, mt := range tests {
		m, err := newRegexpMatcher(regexpOperator, mt.ValB)
		if err != nil {
			t.Fatalf("newRegexpMatcher(%q, %q) error: %v", regexpOperator, mt.ValB, err)
		}
		if result := m.Compare(mt.ValA, ""); result != mt.Expected {
			t.Errorf("regexpMatcher(%q, %q) = %v, want %v", mt.ValA, mt.ValB, result, mt.Expected)
		}
	}
}

func TestNegativeRegexpMatcher(t *testing.T) {
	tests := []matchTest{
		// matching patterns return false (negated)
		{"abcdef", "^abc", false},
		{"abc", "^abc", false},
		{"xxabcxx", "abc", false},
		{"123", "123", false},
		{"5", "^[0-9]+", false},
		// non-matching patterns return true (negated)
		{"xb", "abc", true},
		{"13", "12", true},
	}
	for _, mt := range tests {
		m, err := newRegexpMatcher(negativeRegexOperator, mt.ValB)
		if err != nil {
			t.Fatalf("newRegexpMatcher(%q, %q) error: %v", negativeRegexOperator, mt.ValB, err)
		}
		if result := m.Compare(mt.ValA, ""); result != mt.Expected {
			t.Errorf("negativeRegexpMatcher(%q, %q) = %v, want %v", mt.ValA, mt.ValB, result, mt.Expected)
		}
	}
}

// verifies that an invalid regex pattern returns an error from newRegexpMatcher
func TestRegexpMatcherWithInvalidPattern(t *testing.T) {
	_, err := newRegexpMatcher(regexpOperator, "[invalid")
	if err == nil {
		t.Error("newRegexpMatcher with invalid pattern should return an error")
	}
}

// verifies that an invalid regex pattern returns an error from newRegexpMatcher
// for the negative variant
func TestNegativeRegexpMatcherWithInvalidPattern(t *testing.T) {
	_, err := newRegexpMatcher(negativeRegexOperator, "[invalid")
	if err == nil {
		t.Error("newRegexpMatcher with invalid pattern should return an error")
	}
}

func TestIsDigits(t *testing.T) {
	tests := []struct {
		input    string
		expected bool
	}{
		// empty string returns false
		{input: "", expected: false},
		// plain digits
		{input: "0", expected: true},
		{input: "123", expected: true},
		// positive sign prefix
		{input: "+1", expected: true},
		{input: "+999", expected: true},
		// negative sign prefix
		{input: "-1", expected: true},
		{input: "-42", expected: true},
		// bare sign with no digits returns false
		{input: "+", expected: false},
		{input: "-", expected: false},
		// non-digit characters return false
		{input: "abc", expected: false},
		{input: "12a", expected: false},
		{input: "1.5", expected: false},
		// sign in the middle returns false
		{input: "1+2", expected: false},
	}
	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := isDigits(tt.input)
			if got != tt.expected {
				t.Errorf("isDigits(%q) = %v, want %v", tt.input, got, tt.expected)
			}
		})
	}
}

func TestNewMatcher(t *testing.T) {
	operators := []string{
		equalOperator,
		notEqualOperator,
		moreThanOperator,
		lessThanOperator,
		regexpOperator,
	}
	for _, operator := range operators {
		m, err := newMatcher(operator)
		if err != nil {
			t.Errorf("newMatcher(%s) returned error: %s", operator, err.Error())
		}
		if m.Operator != operator {
			t.Errorf("Got wrong matcher for %s: %s", operator, m.Operator)
		}
	}
}

// verifies that an unknown operator returns an error
func TestInvalidMatcher(t *testing.T) {
	operator := "<>"
	_, err := newMatcher(operator)
	if err == nil {
		t.Errorf("newMatcher(%s) didn't return any error", operator)
	}
}
