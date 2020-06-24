package regex_test

import (
	"fmt"
	"testing"

	"github.com/prymitive/karma/internal/regex"
)

func TestMustCompileAnchored(t *testing.T) {
	type testCaseT struct {
		in  string
		out string
	}

	testCases := []testCaseT{
		{in: "foo", out: "^foo$"},
		{in: "^foo", out: "^foo$"},
		{in: "foo$", out: "^foo$"},
		{in: "^foo$", out: "^foo$"},
		{in: "^^foo$", out: "^^foo$"},
		{in: "foo$$", out: "^foo$$"},
	}

	for _, testCase := range testCases {
		testCase := testCase
		t.Run(fmt.Sprintf("%q => %q", testCase.in, testCase.out), func(t *testing.T) {
			r := regex.MustCompileAnchored(testCase.in)
			if r.String() != testCase.out {
				t.Errorf("Regex mismatch, expected %q got %q", testCase.out, r.String())
			}
		})
	}
}

func TestCompileAnchored(t *testing.T) {
	type testCaseT struct {
		in    string
		out   string
		error bool
	}

	testCases := []testCaseT{
		{in: "foo", out: "^foo$"},
		{in: "^foo", out: "^foo$"},
		{in: "foo$", out: "^foo$"},
		{in: "^foo$", out: "^foo$"},
		{in: "^^foo$", out: "^^foo$"},
		{in: "foo$$", out: "^foo$$"},
		{in: ".******", out: "", error: true},
	}

	for _, testCase := range testCases {
		testCase := testCase
		t.Run(fmt.Sprintf("%q => %q", testCase.in, testCase.out), func(t *testing.T) {
			r, err := regex.CompileAnchored(testCase.in)
			hadError := err != nil
			if testCase.error != hadError {
				t.Errorf("CompileAnchored err=%v, expected error=%v", err, testCase.error)
			}
			if err == nil {
				if r.String() != testCase.out {
					t.Errorf("Regex mismatch, expected %q got %q", testCase.out, r.String())
				}
			}
		})
	}
}
