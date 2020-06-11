package slices_test

import (
	"testing"

	"github.com/prymitive/karma/internal/slices"

	"github.com/google/go-cmp/cmp"
)

type stringSliceTest struct {
	array []string
	value string
	found bool
}

var stringSliceTests = []stringSliceTest{
	{
		array: []string{},
		value: "aa",
		found: false,
	},
	{
		array: []string{"aa", "bb", "cc", "dd"},
		value: "aa",
		found: true,
	},
	{
		array: []string{"aa", "bb", "cc", "dd"},
		value: "bb",
		found: true,
	},
	{
		array: []string{"aa", "bb", "cc", "dd"},
		value: "cc",
		found: true,
	},
	{
		array: []string{"aa", "bb", "cc", "dd"},
		value: "dd",
		found: true,
	},
	{
		array: []string{"aa", "bb", "cc", "dd"},
		value: "bbcc",
		found: false,
	},
	{
		array: []string{"aa", "bb", "cc", "dd"},
		value: "b",
		found: false,
	},
	{
		array: []string{"aa", "bb", "cc", "dd"},
		value: "",
		found: false,
	},
}

func TestStringInSlice(t *testing.T) {
	for _, testCase := range stringSliceTests {
		found := slices.StringInSlice(testCase.array, testCase.value)
		if found != testCase.found {
			t.Errorf("Check if '%s' in slice %v returned %t, expected %t", testCase.value, testCase.array, found, testCase.found)
		}
	}
}

type boolSliceTest struct {
	array []bool
	value bool
	found bool
}

var boolSliceTests = []boolSliceTest{
	{
		array: []bool{},
		value: true,
		found: false,
	},
	{
		array: []bool{},
		value: false,
		found: false,
	},
	{
		array: []bool{true, false},
		value: true,
		found: true,
	},
	{
		array: []bool{true, false},
		value: false,
		found: true,
	},
	{
		array: []bool{false},
		value: true,
		found: false,
	},
	{
		array: []bool{true},
		value: false,
		found: false,
	},
}

func TestBoolInSlice(t *testing.T) {
	for _, testCase := range boolSliceTests {
		found := slices.BoolInSlice(testCase.array, testCase.value)
		if found != testCase.found {
			t.Errorf("Check if '%t' in slice %v returned %t, expected %t", testCase.value, testCase.array, found, testCase.found)
		}
	}
}

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
