package transform_test

import (
	"reflect"
	"testing"

	"github.com/cloudflare/unsee/internal/transform"
)

type linkTest struct {
	before map[string]string
	after  map[string]string
	links  map[string]string
}

var linkTests = []linkTest{
	linkTest{
		before: map[string]string{},
		after:  map[string]string{},
		links:  map[string]string{},
	},
	linkTest{
		before: map[string]string{
			"key1":  "value 1",
			"key2":  "value2",
			"level": "info",
		},
		after: map[string]string{
			"key1":  "value 1",
			"key2":  "value2",
			"level": "info",
		},
		links: map[string]string{},
	},
	linkTest{
		before: map[string]string{
			"key1":  "value 1",
			"key2":  "http://localhost",
			"level": "info",
		},
		after: map[string]string{
			"key1":  "value 1",
			"level": "info",
		},
		links: map[string]string{
			"key2": "http://localhost",
		},
	},
	linkTest{
		before: map[string]string{
			"key1":  "value 1",
			"key2":  "https://example.com/abc",
			"level": "info",
		},
		after: map[string]string{
			"key1":  "value 1",
			"level": "info",
		},
		links: map[string]string{
			"key2": "https://example.com/abc",
		},
	},
	linkTest{
		before: map[string]string{
			"key1":  "value 1",
			"key2":  "file://example/abc",
			"level": "info",
		},
		after: map[string]string{
			"key1":  "value 1",
			"key2":  "file://example/abc",
			"level": "info",
		},
		links: map[string]string{},
	},
	linkTest{
		before: map[string]string{
			"key1":  "value 1",
			"key2":  "ftp://example/abc",
			"level": "info",
		},
		after: map[string]string{
			"key1":  "value 1",
			"level": "info",
		},
		links: map[string]string{
			"key2": "ftp://example/abc",
		},
	},
}

func TestDetectLinks(t *testing.T) {
	for _, testCase := range linkTests {
		after, links := transform.DetectLinks(testCase.before)
		if !reflect.DeepEqual(after, testCase.after) {
			t.Errorf("DetectLinks returned invalid annotation map, expected %v, got %v", testCase.after, after)
		}
		if !reflect.DeepEqual(links, testCase.links) {
			t.Errorf("DetectLinks returned invalid link map, expected %v, got %v", testCase.links, links)
		}
	}
}
