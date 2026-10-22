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

func TestAclIsAllowedOperations(t *testing.T) {
	silence := &models.Silence{
		Matchers: []models.SilenceMatcher{
			models.NewSilenceMatcher("instance", "server7", false, false),
		},
	}

	type testCaseT struct {
		description string
		operation   string
		operations  []string
		isAllowed   bool
	}

	testCases := []testCaseT{
		{
			description: "no operations set, create is allowed",
			operation:   "create",
			isAllowed:   true,
		},
		{
			description: "no operations set, edit is allowed",
			operation:   "edit",
			isAllowed:   true,
		},
		{
			description: "no operations set, delete is allowed",
			operation:   "delete",
			isAllowed:   true,
		},
		{
			description: "create scoped rule, create is allowed",
			operation:   "create",
			operations:  []string{"create"},
			isAllowed:   true,
		},
		{
			description: "create scoped rule, edit is not allowed",
			operation:   "edit",
			operations:  []string{"create"},
			isAllowed:   false,
		},
		{
			description: "create scoped rule, delete is not allowed",
			operation:   "delete",
			operations:  []string{"create"},
			isAllowed:   false,
		},
		{
			description: "edit scoped rule, edit is allowed",
			operation:   "edit",
			operations:  []string{"edit"},
			isAllowed:   true,
		},
		{
			description: "delete scoped rule, delete is allowed",
			operation:   "delete",
			operations:  []string{"delete"},
			isAllowed:   true,
		},
		{
			description: "create and delete scoped rule, delete is allowed",
			operation:   "delete",
			operations:  []string{"create", "delete"},
			isAllowed:   true,
		},
		{
			description: "create and delete scoped rule, edit is not allowed",
			operation:   "edit",
			operations:  []string{"create", "delete"},
			isAllowed:   false,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			acl := &silenceACL{
				Action: "allow",
				Reason: "allow operation",
				Scope: silenceACLScope{
					Groups:        []string{},
					Alertmanagers: []string{},
					Filters:       []silenceFilter{},
					Operations:    testCase.operations,
				},
				Matchers: aclMatchers{},
			}

			isAllowed, err := acl.isAllowed(testCase.operation, "test", silence, []string{})
			if err != nil {
				t.Errorf("isAllowed() returned error: %v", err)
			}
			if isAllowed != testCase.isAllowed {
				t.Errorf("isAllowed() returned %v, expected %v", isAllowed, testCase.isAllowed)
			}
		})
	}
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
