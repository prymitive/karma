package slices_test

import (
	"testing"

	"github.com/prymitive/karma/internal/slices"

	"github.com/google/go-cmp/cmp"
)

func TestStringSliceToSHA1(t *testing.T) {
	s, err := slices.StringSliceToSHA1([]string{"a", "b", "c"})
	if err != nil {
		t.Errorf("StringSliceToSHA1() returned error: %s", err)
	}
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
