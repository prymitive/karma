package filters

import (
	"regexp"
	"testing"
	"time"
)

type matchTest struct {
	ValA     any
	ValB     any
	IsValid  bool
	Expacted bool
}

func TestEqualMatcher(t *testing.T) {
	now := time.Now()
	tests := []matchTest{
		{"a", "a", true, true},
		{"abc", "abc", true, true},
		{123, 123, true, true},
		{now, now, true, true},
		{"1", 1, true, false},
		{"a", "ab", true, false},
		{12, 13, true, false},
		{&matchTest{}, &matchTest{}, true, false},
	}
	for _, mt := range tests {
		m := equalMatcher{}
		if result := m.Compare(mt.ValA, mt.ValB); result != mt.Expacted {
			t.Errorf("EqualMatcher(%#v, %#v) returned %v when %v was expected", mt.ValA, mt.ValB, result, mt.Expacted)
		}
	}
}

func TestNotEqualMatcher(t *testing.T) {
	now := time.Now()
	tests := []matchTest{
		{"a", "a", true, false},
		{"abc", "abc", true, false},
		{123, 123, true, false},
		{now, now, true, false},
		{"1", 1, true, true},
		{"a", "ab", true, true},
		{12, 13, true, true},
	}
	for _, mt := range tests {
		m := notEqualMatcher{}
		if result := m.Compare(mt.ValA, mt.ValB); result != mt.Expacted {
			t.Errorf("NotEqualMatcher(%#v, %#v) returned %v when %v was expected", mt.ValA, mt.ValB, result, mt.Expacted)
		}
	}
}

func TestMoreThanMatcher(t *testing.T) {
	tests := []matchTest{
		{10, 1, true, true},
		{"10", "1", true, true},
		{8, 8, true, false},
		{"8", "8", true, false},
		{4, 9, true, false},
		{"4", "9", true, false},
		{"b", "a", true, true},
		{"a", "a", true, false},
		{"a", "b", true, false},
		{"", "", true, false},
	}
	for _, mt := range tests {
		m := moreThanMatcher{}
		if result := m.Compare(mt.ValA, mt.ValB); result != mt.Expacted {
			t.Errorf("MoreThanMatcher(%#v, %#v) returned %v when %v was expected", mt.ValA, mt.ValB, result, mt.Expacted)
		}
	}
}

func TestLessThanMatcher(t *testing.T) {
	tests := []matchTest{
		{10, 1, true, false},
		{"10", "1", true, false},
		{8, 8, true, false},
		{"8", "8", true, false},
		{4, 9, true, true},
		{"4", "9", true, true},
		{"b", "a", true, false},
		{"a", "a", true, false},
		{"a", "b", true, true},
		{"", "", true, false},
	}
	for _, mt := range tests {
		m := lessThanMatcher{}
		if result := m.Compare(mt.ValA, mt.ValB); result != mt.Expacted {
			t.Errorf("LessThanMatcher(%#v, %#v) returned %v when %v was expected", mt.ValA, mt.ValB, result, mt.Expacted)
		}
	}
}

func TestRegexpMatcher(t *testing.T) {
	tests := []matchTest{
		{"abcdef", "^abc", true, true},
		{"abc", "^abc", true, true},
		{"xxabcxx", "abc", true, true},
		{"123", "123", true, true},
		{"5", "^[0-9]+", true, true},
		{"xb", "abc", true, false},
		{"13", "12", true, false},
	}
	for _, mt := range tests {
		m := regexpMatcher{}
		if result := m.Compare(mt.ValA, regexp.MustCompile(mt.ValB.(string))); result != mt.Expacted {
			t.Errorf("RegexpMatcher(%#v, %#v) returned %v when %v was expected", mt.ValA, mt.ValB, result, mt.Expacted)
		}

	}
}

func TestNegativeRegexpMatcher(t *testing.T) {
	tests := []matchTest{
		{"abcdef", "^abc", true, false},
		{"abc", "^abc", true, false},
		{"xxabcxx", "abc", true, false},
		{"123", "123", true, false},
		{"5", "^[0-9]+", true, false},
		{"xb", "abc", true, true},
		{"13", "12", true, true},
	}
	for _, mt := range tests {
		m := negativeRegexMatcher{}
		if result := m.Compare(mt.ValA, regexp.MustCompile(mt.ValB.(string))); result != mt.Expacted {
			t.Errorf("NegativeRegexMatcher(%#v, %#v) returned %v when %v was expected", mt.ValA, mt.ValB, result, mt.Expacted)
		}

	}
}

func TestRegexpMatcherWithStringValB(t *testing.T) {
	tests := []matchTest{
		// verifies that passing a raw string pattern (not pre-compiled) compiles and matches
		{"abcdef", "^abc", true, true},
		// verifies cache hit on the same string pattern
		{"abcdef", "^abc", true, true},
		// verifies that a non-matching raw string pattern returns false
		{"xyz", "^abc", true, false},
	}
	for _, mt := range tests {
		m := regexpMatcher{}
		if result := m.Compare(mt.ValA, mt.ValB); result != mt.Expacted {
			t.Errorf("RegexpMatcher(%#v, %#v string) returned %v when %v was expected", mt.ValA, mt.ValB, result, mt.Expacted)
		}
	}
}

func TestRegexpMatcherWithInvalidPattern(t *testing.T) {
	// verifies that an invalid regex pattern string returns false instead of panicking
	m := regexpMatcher{}
	result := m.Compare("foo", "[invalid")
	if result != false {
		t.Errorf("RegexpMatcher with invalid pattern returned %v, expected false", result)
	}
}

func TestNegativeRegexpMatcherWithStringValB(t *testing.T) {
	tests := []matchTest{
		// verifies that passing a raw string pattern (not pre-compiled) compiles and negation works
		{"abcdef", "^abcdef$", true, false},
		// verifies cache hit on the same string pattern
		{"abcdef", "^abcdef$", true, false},
		// verifies that a non-matching raw string pattern returns true (negated)
		{"xyz", "^abcdef$", true, true},
	}
	for _, mt := range tests {
		m := negativeRegexMatcher{}
		if result := m.Compare(mt.ValA, mt.ValB); result != mt.Expacted {
			t.Errorf("NegativeRegexMatcher(%#v, %#v string) returned %v when %v was expected", mt.ValA, mt.ValB, result, mt.Expacted)
		}
	}
}

func TestNegativeRegexpMatcherWithInvalidPattern(t *testing.T) {
	// verifies that an invalid regex pattern string returns false instead of panicking
	m := negativeRegexMatcher{}
	result := m.Compare("foo", "[invalid")
	if result != false {
		t.Errorf("NegativeRegexMatcher with invalid pattern returned %v, expected false", result)
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
			t.Errorf("NewMatcher(%s) returned error: %s", operator, err.Error())
		}
		if m.GetOperator() != operator {
			t.Errorf("Got wrong matcher for %s: %s", operator, m.GetOperator())
		}
	}
}

func TestInvalidMatcher(t *testing.T) {
	operator := "<>"
	m, err := newMatcher(operator)
	if err == nil {
		t.Errorf("NewMatcher(%s) didn't return any error: %s", operator, m)
	}
	if m != nil {
		t.Errorf("NewMatcher(%s) returned non-nil value: %s", operator, m)
	}
}
