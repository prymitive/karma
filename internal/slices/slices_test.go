package slices_test

import (
	"regexp"
	"testing"

	"github.com/prymitive/karma/internal/slices"

	"github.com/google/go-cmp/cmp"
)

func TestStringSliceToSHA1(t *testing.T) {
	s := slices.StringSliceToSHA1([]string{"a", "b", "c"})
	if s == "" {
		t.Errorf("StringSliceToSHA1() returned empty string")
	}
}

func TestStringSliceDiff(t *testing.T) {
	type testCaseT struct {
		a       []string
		b       []string
		missing []string
		extra   []string
	}

	testCases := []testCaseT{
		{
			a:       []string{"a"},
			b:       []string{"a"},
			missing: []string{},
			extra:   []string{},
		},
		{
			a:       []string{},
			b:       []string{"a"},
			missing: []string{},
			extra:   []string{"a"},
		},
		{
			a:       []string{"a", "b"},
			b:       []string{"a"},
			missing: []string{"b"},
			extra:   []string{},
		},
		{
			a:       []string{"a", "b"},
			b:       []string{"c"},
			missing: []string{"a", "b"},
			extra:   []string{"c"},
		},
	}

	for _, testCase := range testCases {
		missing, extra := slices.StringSliceDiff(testCase.a, testCase.b)
		if diff := cmp.Diff(testCase.missing, missing); diff != "" {
			t.Errorf("Incorrect slice diff missing (-want +got):\n%s", diff)
		}
		if diff := cmp.Diff(testCase.extra, extra); diff != "" {
			t.Errorf("Incorrect slice diff extra (-want +got):\n%s", diff)
		}
	}
}

func TestMatchesAnyRegex(t *testing.T) {
	type testCaseT struct {
		value    string
		regexes  []*regexp.Regexp
		expected bool
	}

	testCases := []testCaseT{
		// verifies that an empty regex list never matches
		{
			value:    "foo",
			regexes:  []*regexp.Regexp{},
			expected: false,
		},
		// verifies that a matching regex returns true
		{
			value:    "foo",
			regexes:  []*regexp.Regexp{regexp.MustCompile("^foo$")},
			expected: true,
		},
		// verifies that a non-matching regex returns false
		{
			value:    "bar",
			regexes:  []*regexp.Regexp{regexp.MustCompile("^foo$")},
			expected: false,
		},
		// verifies that the second regex in the list can match
		{
			value:    "bar",
			regexes:  []*regexp.Regexp{regexp.MustCompile("^foo$"), regexp.MustCompile("^bar$")},
			expected: true,
		},
	}

	for _, tc := range testCases {
		result := slices.MatchesAnyRegex(tc.value, tc.regexes)
		if result != tc.expected {
			t.Errorf("MatchesAnyRegex(%q, ...) returned %v, expected %v", tc.value, result, tc.expected)
		}
	}
}
