package filters

import (
	"testing"
	"time"
)

type matchTest struct {
	ValA     interface{}
	ValB     interface{}
	IsValid  bool
	Expacted bool
}

func TestEqualMatcher(t *testing.T) {
	now := time.Now()
	tests := []matchTest{
		matchTest{"a", "a", true, true},
		matchTest{"abc", "abc", true, true},
		matchTest{123, 123, true, true},
		matchTest{now, now, true, true},
		matchTest{"1", 1, true, false},
		matchTest{"a", "ab", true, false},
		matchTest{12, 13, true, false},
		matchTest{time.Now(), time.Now(), true, false},
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
		matchTest{"a", "a", true, false},
		matchTest{"abc", "abc", true, false},
		matchTest{123, 123, true, false},
		matchTest{now, now, true, false},
		matchTest{"1", 1, true, true},
		matchTest{"a", "ab", true, true},
		matchTest{12, 13, true, true},
		matchTest{time.Now(), time.Now(), true, true},
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
		matchTest{10, 1, true, true},
		matchTest{"10", "1", true, true},
		matchTest{8, 8, true, false},
		matchTest{"8", "8", true, false},
		matchTest{4, 9, true, false},
		matchTest{"4", "9", true, false},
		matchTest{"b", "a", true, true},
		matchTest{"a", "a", true, false},
		matchTest{"a", "b", true, false},
		matchTest{"", "", true, false},
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
		matchTest{10, 1, true, false},
		matchTest{"10", "1", true, false},
		matchTest{8, 8, true, false},
		matchTest{"8", "8", true, false},
		matchTest{4, 9, true, true},
		matchTest{"4", "9", true, true},
		matchTest{"b", "a", true, false},
		matchTest{"a", "a", true, false},
		matchTest{"a", "b", true, true},
		matchTest{"", "", true, false},
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
		matchTest{"abcdef", "^abc", true, true},
		matchTest{"abc", "^abc", true, true},
		matchTest{"xxabcxx", "abc", true, true},
		matchTest{"123", "123", true, true},
		matchTest{"5", "^[0-9]+", true, true},
		matchTest{"xb", "abc", true, false},
		matchTest{"13", "12", true, false},
		matchTest{"xx", "^[-xxx****", false, false},
	}
	for _, mt := range tests {
		m := regexpMatcher{}
		if result := m.Compare(mt.ValA, mt.ValB); result != mt.Expacted {
			t.Errorf("RegexpMatcher(%#v, %#v) returned %v when %v was expected", mt.ValA, mt.ValB, result, mt.Expacted)
		}

	}
}

func TestNegativeRegexpMatcher(t *testing.T) {
	tests := []matchTest{
		matchTest{"abcdef", "^abc", true, false},
		matchTest{"abc", "^abc", true, false},
		matchTest{"xxabcxx", "abc", true, false},
		matchTest{"123", "123", true, false},
		matchTest{"5", "^[0-9]+", true, false},
		matchTest{"xb", "abc", true, true},
		matchTest{"13", "12", true, true},
		matchTest{"xx", "^[-xxx****", false, true},
	}
	for _, mt := range tests {
		m := negativeRegexMatcher{}
		if result := m.Compare(mt.ValA, mt.ValB); result != mt.Expacted {
			t.Errorf("NegativeRegexMatcher(%#v, %#v) returned %v when %v was expected", mt.ValA, mt.ValB, result, mt.Expacted)
		}

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
