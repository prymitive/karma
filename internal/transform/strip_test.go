package transform_test

import (
	"github.com/prymitive/karma/internal/regex"
	"reflect"
	"regexp"
	"testing"

	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/transform"
)

type stripLabelTest struct {
	strip      []string
	keep       []string
	stripRegex []string
	keepRegex  []string
	before     map[string]string
	after      map[string]string
}

var stripLabelTests = []stripLabelTest{
	{
		strip:      []string{"env"},
		keep:       []string{},
		stripRegex: []string{},
		keepRegex:  []string{},
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
	{
		strip:      []string{"server"},
		keep:       []string{},
		stripRegex: []string{},
		keepRegex:  []string{},
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
	{
		strip:      []string{},
		keep:       []string{},
		stripRegex: []string{},
		keepRegex:  []string{},
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
	{
		strip:      []string{"host"},
		keep:       []string{},
		stripRegex: []string{},
		keepRegex:  []string{},
		before: map[string]string{
			"host": "localhost",
		},
		after: map[string]string{},
	},
	{
		strip:      []string{},
		keep:       []string{"env"},
		stripRegex: []string{},
		keepRegex:  []string{},
		before: map[string]string{
			"host":  "localhost",
			"env":   "production",
			"level": "info",
		},
		after: map[string]string{
			"env": "production",
		},
	},
	{
		strip:      []string{"env"},
		keep:       []string{"host"},
		stripRegex: []string{},
		keepRegex:  []string{},
		before: map[string]string{
			"host":  "localhost",
			"env":   "production",
			"level": "info",
		},
		after: map[string]string{
			"host": "localhost",
		},
	},
	{
		strip:      []string{},
		keep:       []string{"env"},
		stripRegex: []string{},
		keepRegex:  []string{},
		before: map[string]string{
			"host":  "localhost",
			"level": "info",
		},
		after: map[string]string{},
	},
	{
		strip:      []string{},
		keep:       []string{},
		stripRegex: []string{".*e.*"},
		keepRegex:  []string{},
		before: map[string]string{
			"host":  "localhost",
			"env":   "production",
			"level": "info",
		},
		after: map[string]string{
			"host": "localhost",
		},
	},
	{
		strip:      []string{},
		keep:       []string{},
		stripRegex: []string{},
		keepRegex:  []string{".*e.*"},
		before: map[string]string{
			"host":  "localhost",
			"env":   "production",
			"level": "info",
		},
		after: map[string]string{
			"env":   "production",
			"level": "info",
		},
	},
	{
		strip:      []string{},
		keep:       []string{"env", "level"},
		stripRegex: []string{".*el"},
		keepRegex:  []string{},
		before: map[string]string{
			"host":  "localhost",
			"env":   "production",
			"level": "info",
		},
		after: map[string]string{
			"env": "production",
		},
	},
	{
		strip:      []string{"level"},
		keep:       []string{},
		stripRegex: []string{},
		keepRegex:  []string{".*e.*"},
		before: map[string]string{
			"host":  "localhost",
			"env":   "production",
			"level": "info",
		},
		after: map[string]string{
			"env": "production",
		},
	},
}

func TestStripLables(t *testing.T) {
	for _, testCase := range stripLabelTests {
		keepRegex := getCompiledRegex(testCase.keepRegex, t)
		stripRegex := getCompiledRegex(testCase.stripRegex, t)
		labels := transform.StripLables(testCase.keep, testCase.strip, keepRegex, stripRegex, testCase.before)
		if !reflect.DeepEqual(labels, testCase.after) {
			t.Errorf("StripLables failed, expected %v, got %v", testCase.after, labels)
		}
	}
}

func getCompiledRegex(regexes []string, t *testing.T) []*regexp.Regexp {
	compiledRegexes := []*regexp.Regexp{}
	for _, r := range regexes {
		c, err := regex.CompileAnchored(r)
		if err != nil {
			t.Errorf("Invalid test setup: invalid regex '%s': %s", r, err)
		}
		compiledRegexes = append(compiledRegexes, c)
	}
	return compiledRegexes
}

type stripReceiverTest struct {
	strip    []string
	keep     []string
	receiver string
	stripped bool
}

var stripReceiverTests = []stripReceiverTest{
	{
		strip:    []string{},
		keep:     []string{},
		receiver: "default",
		stripped: false,
	},
	{
		strip:    []string{"default"},
		keep:     []string{},
		receiver: "default",
		stripped: true,
	},
	{
		strip:    []string{"default"},
		keep:     []string{"default"},
		receiver: "default",
		stripped: true,
	},
	{
		strip:    []string{},
		keep:     []string{"default"},
		receiver: "default",
		stripped: false,
	},
	{
		strip:    []string{"foo", "bar"},
		keep:     []string{},
		receiver: "default",
		stripped: false,
	},
	{
		strip:    []string{"foo", "default"},
		keep:     []string{"foo", "bar"},
		receiver: "default",
		stripped: true,
	},
}

func TestStripReceivers(t *testing.T) {
	for _, testCase := range stripReceiverTests {
		stripped := transform.StripReceivers(testCase.keep, testCase.strip, testCase.receiver)
		if stripped != testCase.stripped {
			t.Errorf("StripReceivers failed, expected %v, got %v", testCase.stripped, stripped)
		}
	}
}

type stripAnnotationTest struct {
	strip  []string
	keep   []string
	before models.Annotations
	after  models.Annotations
}

var stripAnnotationTests = []stripAnnotationTest{
	{
		strip: []string{},
		keep:  []string{},
		before: models.Annotations{
			models.Annotation{Name: "foo", Value: "bar"},
		},
		after: models.Annotations{
			models.Annotation{Name: "foo", Value: "bar"},
		},
	},
	{
		strip: []string{"foo"},
		keep:  []string{},
		before: models.Annotations{
			models.Annotation{Name: "foo", Value: "bar"},
		},
		after: models.Annotations{},
	},
	{
		strip: []string{"foo"},
		keep:  []string{},
		before: models.Annotations{
			models.Annotation{Name: "foo", Value: "bar"},
			models.Annotation{Name: "boo", Value: "baz"},
		},
		after: models.Annotations{
			models.Annotation{Name: "boo", Value: "baz"},
		},
	},
	{
		strip: []string{},
		keep:  []string{"foo"},
		before: models.Annotations{
			models.Annotation{Name: "foo", Value: "bar"},
		},
		after: models.Annotations{
			models.Annotation{Name: "foo", Value: "bar"},
		},
	},
	{
		strip: []string{},
		keep:  []string{"foo"},
		before: models.Annotations{
			models.Annotation{Name: "foo", Value: "bar"},
			models.Annotation{Name: "boo", Value: "baz"},
		},
		after: models.Annotations{
			models.Annotation{Name: "foo", Value: "bar"},
		},
	},
}

func TestStripAnnotations(t *testing.T) {
	for _, testCase := range stripAnnotationTests {
		annotations := transform.StripAnnotations(testCase.keep, testCase.strip, testCase.before)
		if !reflect.DeepEqual(annotations, testCase.after) {
			t.Errorf("StripAnnotations failed, expected %v, got %v", testCase.after, annotations)
		}
	}
}
