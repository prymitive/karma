package transform

import "testing"

type sliceTest struct {
	array []string
	value string
	found bool
}

var sliceTests = []sliceTest{
	sliceTest{
		array: []string{"aa", "bb", "cc", "dd"},
		value: "aa",
		found: true,
	},
	sliceTest{
		array: []string{"aa", "bb", "cc", "dd"},
		value: "bb",
		found: true,
	},
	sliceTest{
		array: []string{"aa", "bb", "cc", "dd"},
		value: "cc",
		found: true,
	},
	sliceTest{
		array: []string{"aa", "bb", "cc", "dd"},
		value: "dd",
		found: true,
	},
	sliceTest{
		array: []string{"aa", "bb", "cc", "dd"},
		value: "bbcc",
		found: false,
	},
	sliceTest{
		array: []string{"aa", "bb", "cc", "dd"},
		value: "b",
		found: false,
	},
	sliceTest{
		array: []string{"aa", "bb", "cc", "dd"},
		value: "",
		found: false,
	},
}

func TestStringInSlice(t *testing.T) {
	for _, testCase := range sliceTests {
		found := stringInSlice(testCase.array, testCase.value)
		if found != testCase.found {
			t.Errorf("Check if '%s' in slice %v returned %v, expected %v", testCase.value, testCase.array, found, testCase.found)
		}
	}
}
