package main

import (
	"regexp"
	"testing"

	"github.com/prymitive/karma/internal/models"
)

func truePtr() *bool {
	b := true
	return &b
}

func falsePtr() *bool {
	b := false
	return &b
}

func TestAclSilenceMatcher(t *testing.T) {
	type testCaseT struct {
		requiredMatcher silenceMatcher
		silenceMatcher  models.SilenceMatcher
		isMatch         bool
	}

	testCases := []testCaseT{
		{
			requiredMatcher: silenceMatcher{
				Name:  "foo",
				Value: "bar",
			},
			silenceMatcher: models.NewSilenceMatcher("foo", "bar", false, false),
			isMatch:        true,
		},
		{
			requiredMatcher: silenceMatcher{
				Name:  "foo",
				Value: "bar",
			},
			silenceMatcher: models.NewSilenceMatcher("bar", "bar", false, false),
			isMatch:        false,
		},
		{
			requiredMatcher: silenceMatcher{
				Name:  "foo",
				Value: "bar",
			},
			silenceMatcher: models.NewSilenceMatcher("foo", "foo", false, false),
			isMatch:        false,
		},
		{
			requiredMatcher: silenceMatcher{
				Name:    "foo",
				Value:   "bar",
				IsRegex: truePtr(),
			},
			silenceMatcher: models.NewSilenceMatcher("foo", "bar", false, false),
			isMatch:        false,
		},
		{
			requiredMatcher: silenceMatcher{
				Name:    "foo",
				Value:   "bar",
				IsRegex: falsePtr(),
			},
			silenceMatcher: models.NewSilenceMatcher("foo", "bar", true, false),
			isMatch:        false,
		},
		{
			requiredMatcher: silenceMatcher{
				Name:    "foo",
				Value:   "bar",
				IsRegex: falsePtr(),
			},
			silenceMatcher: models.NewSilenceMatcher("foo", "bar", false, false),
			isMatch:        true,
		},
		{
			requiredMatcher: silenceMatcher{
				Name:    "foo",
				Value:   "bar",
				IsRegex: truePtr(),
			},
			silenceMatcher: models.NewSilenceMatcher("foo", "bar", false, false),
			isMatch:        false,
		},
		{
			requiredMatcher: silenceMatcher{
				Name:    "foo",
				Value:   "bar",
				IsRegex: truePtr(),
			},
			silenceMatcher: models.NewSilenceMatcher("foo", "bar", true, false),
			isMatch:        true,
		},
		{
			requiredMatcher: silenceMatcher{
				NameRegex: regexp.MustCompile("^.+$"),
				Value:     "bar",
			},
			silenceMatcher: models.NewSilenceMatcher("foo", "bar", false, false),
			isMatch:        true,
		},
		{
			requiredMatcher: silenceMatcher{
				NameRegex: regexp.MustCompile("^notfoo$"),
				Value:     "bar",
			},
			silenceMatcher: models.NewSilenceMatcher("foo", "bar", false, false),
			isMatch:        false,
		},
		{
			requiredMatcher: silenceMatcher{
				NameRegex:  regexp.MustCompile("^.+$"),
				ValueRegex: regexp.MustCompile("^.+$"),
			},
			silenceMatcher: models.NewSilenceMatcher("foo", "bar", false, false),
			isMatch:        true,
		},
		{
			requiredMatcher: silenceMatcher{
				NameRegex:  regexp.MustCompile("^.+$"),
				ValueRegex: regexp.MustCompile("^bar.+$"),
			},
			silenceMatcher: models.NewSilenceMatcher("foo", "notbar", false, false),
			isMatch:        false,
		},
		{
			requiredMatcher: silenceMatcher{
				NameRegex:  regexp.MustCompile("^.+$"),
				ValueRegex: regexp.MustCompile("^.+$"),
				IsRegex:    truePtr(),
			},
			silenceMatcher: models.NewSilenceMatcher("foo", "bar", false, false),
			isMatch:        false,
		},
		{
			requiredMatcher: silenceMatcher{
				Name:    "foo",
				Value:   "bar",
				IsRegex: truePtr(),
				IsEqual: falsePtr(),
			},
			silenceMatcher: models.NewSilenceMatcher("foo", "bar", true, false),
			isMatch:        true,
		},
		{
			requiredMatcher: silenceMatcher{
				Name:    "foo",
				Value:   "bar",
				IsRegex: truePtr(),
				IsEqual: truePtr(),
			},
			silenceMatcher: models.NewSilenceMatcher("foo", "bar", true, true),
			isMatch:        true,
		},
		{
			requiredMatcher: silenceMatcher{
				Name:    "foo",
				Value:   "bar",
				IsEqual: falsePtr(),
			},
			silenceMatcher: models.NewSilenceMatcher("foo", "bar", false, true),
			isMatch:        false,
		},
		{
			requiredMatcher: silenceMatcher{
				Name:    "foo",
				Value:   "bar",
				IsEqual: truePtr(),
			},
			silenceMatcher: models.NewSilenceMatcher("foo", "bar", false, false),
			isMatch:        false,
		},
	}

	for _, testCase := range testCases {
		isMatch := testCase.requiredMatcher.isMatch(testCase.silenceMatcher)
		if isMatch != testCase.isMatch {
			t.Errorf("isMatch() returned %v, expected %v, requiredMatcher=%v silenceMatcher=%v", isMatch, testCase.isMatch, testCase.requiredMatcher, testCase.silenceMatcher)
		}
	}
}
