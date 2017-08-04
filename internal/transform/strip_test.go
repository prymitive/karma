package transform_test

import (
	"reflect"
	"testing"

	"github.com/cloudflare/unsee/internal/transform"
)

type stripTest struct {
	strip  []string
	before map[string]string
	after  map[string]string
}

var stripTests = []stripTest{
	stripTest{
		strip: []string{"env"},
		before: map[string]string{
			"host":  "localhost",
			"env":   "production",
			"level": "info",
		},
		after: map[string]string{
			"host":  "localhost",
			"level": "info",
		},
	},
	stripTest{
		strip: []string{"server"},
		before: map[string]string{
			"host":  "localhost",
			"env":   "production",
			"level": "info",
		},
		after: map[string]string{
			"host":  "localhost",
			"env":   "production",
			"level": "info",
		},
	},
	stripTest{
		strip: []string{},
		before: map[string]string{
			"host":  "localhost",
			"env":   "production",
			"level": "info",
		},
		after: map[string]string{
			"host":  "localhost",
			"env":   "production",
			"level": "info",
		},
	},
	stripTest{
		strip: []string{"host"},
		before: map[string]string{
			"host": "localhost",
		},
		after: map[string]string{},
	},
}

func TestStripLables(t *testing.T) {
	for _, testCase := range stripTests {
		labels := transform.StripLables(testCase.strip, testCase.before)
		if !reflect.DeepEqual(labels, testCase.after) {
			t.Errorf("StripLables failed, expected %v, got %v", testCase.after, labels)
		}
	}
}
