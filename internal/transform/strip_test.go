package transform_test

import (
	"reflect"
	"regexp"
	"testing"

	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/regex"
	"github.com/prymitive/karma/internal/transform"
)

type stripLabelTest struct {
	strip      []string
	keep       []string
	stripRegex []string
	keepRegex  []string
	before     models.Labels
	after      models.Labels
}

var stripLabelTests = []stripLabelTest{
	{
		strip:      []string{"env"},
		keep:       []string{},
		stripRegex: []string{},
		keepRegex:  []string{},
		before: models.Labels{
			{Name: "host", Value: "localhost"},
			{Name: "env", Value: "production"},
			{Name: "level", Value: "info"},
		},
		after: models.Labels{
			{Name: "host", Value: "localhost"},
			{Name: "level", Value: "info"},
		},
	},
	{
		strip:      []string{"server"},
		keep:       []string{},
		stripRegex: []string{},
		keepRegex:  []string{},
		before: models.Labels{
			{Name: "host", Value: "localhost"},
			{Name: "env", Value: "production"},
			{Name: "level", Value: "info"},
		},
		after: models.Labels{
			{Name: "env", Value: "production"},
			{Name: "host", Value: "localhost"},
			{Name: "level", Value: "info"},
		},
	},
	{
		strip:      []string{},
		keep:       []string{},
		stripRegex: []string{},
		keepRegex:  []string{},
		before: models.Labels{
			{Name: "env", Value: "production"},
			{Name: "host", Value: "localhost"},
			{Name: "level", Value: "info"},
		},
		after: models.Labels{
			{Name: "env", Value: "production"},
			{Name: "host", Value: "localhost"},
			{Name: "level", Value: "info"},
		},
	},
	{
		strip:      []string{"host"},
		keep:       []string{},
		stripRegex: []string{},
		keepRegex:  []string{},
		before: models.Labels{
			{Name: "host", Value: "localhost"},
		},
		after: models.Labels{},
	},
	{
		strip:      []string{},
		keep:       []string{"env"},
		stripRegex: []string{},
		keepRegex:  []string{},
		before: models.Labels{
			{Name: "host", Value: "localhost"},
			{Name: "env", Value: "production"},
			{Name: "level", Value: "info"},
		},
		after: models.Labels{
			{Name: "env", Value: "production"},
		},
	},
	{
		strip:      []string{"env"},
		keep:       []string{"host"},
		stripRegex: []string{},
		keepRegex:  []string{},
		before: models.Labels{
			{Name: "host", Value: "localhost"},
			{Name: "env", Value: "production"},
			{Name: "level", Value: "info"},
		},
		after: models.Labels{
			{Name: "host", Value: "localhost"},
		},
	},
	{
		strip:      []string{},
		keep:       []string{"env"},
		stripRegex: []string{},
		keepRegex:  []string{},
		before: models.Labels{
			{Name: "host", Value: "localhost"},
			{Name: "level", Value: "info"},
		},
		after: models.Labels{},
	},
	{
		strip:      []string{},
		keep:       []string{},
		stripRegex: []string{".*e.*"},
		keepRegex:  []string{},
		before: models.Labels{
			{Name: "host", Value: "localhost"},
			{Name: "env", Value: "production"},
			{Name: "level", Value: "info"},
		},
		after: models.Labels{
			{Name: "host", Value: "localhost"},
		},
	},
	{
		strip:      []string{},
		keep:       []string{},
		stripRegex: []string{},
		keepRegex:  []string{".*e.*"},
		before: models.Labels{
			{Name: "host", Value: "localhost"},
			{Name: "env", Value: "production"},
			{Name: "level", Value: "info"},
		},
		after: models.Labels{
			{Name: "env", Value: "production"},
			{Name: "level", Value: "info"},
		},
	},
	{
		strip:      []string{},
		keep:       []string{"env", "level"},
		stripRegex: []string{".*el"},
		keepRegex:  []string{},
		before: models.Labels{
			{Name: "host", Value: "localhost"},
			{Name: "env", Value: "production"},
			{Name: "level", Value: "info"},
		},
		after: models.Labels{
			{Name: "env", Value: "production"},
		},
	},
	{
		strip:      []string{"level"},
		keep:       []string{},
		stripRegex: []string{},
		keepRegex:  []string{".*e.*"},
		before: models.Labels{
			{Name: "host", Value: "localhost"},
			{Name: "env", Value: "production"},
			{Name: "level", Value: "info"},
		},
		after: models.Labels{
			{Name: "env", Value: "production"},
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
	stripRe  []string
	keepRe   []string
	receiver string
	stripped bool
}

var stripReceiverTests = []stripReceiverTest{
	{
		strip:    []string{},
		keep:     []string{},
		stripRe:  []string{},
		keepRe:   []string{},
		receiver: "default",
		stripped: false,
	},
	{
		strip:    []string{"default"},
		keep:     []string{},
		stripRe:  []string{},
		keepRe:   []string{},
		receiver: "default",
		stripped: true,
	},
	{
		strip:    []string{"default"},
		keep:     []string{"default"},
		stripRe:  []string{},
		keepRe:   []string{},
		receiver: "default",
		stripped: true,
	},
	{
		strip:    []string{},
		keep:     []string{"default"},
		stripRe:  []string{},
		keepRe:   []string{},
		receiver: "default",
		stripped: false,
	},
	{
		strip:    []string{"foo", "bar"},
		keep:     []string{},
		stripRe:  []string{},
		keepRe:   []string{},
		receiver: "default",
		stripped: false,
	},
	{
		strip:    []string{"foo", "default"},
		keep:     []string{"foo", "bar"},
		stripRe:  []string{},
		keepRe:   []string{},
		receiver: "default",
		stripped: true,
	},
	{
		strip:    []string{},
		keep:     []string{},
		stripRe:  []string{},
		keepRe:   []string{"default-.+"},
		receiver: "default-foo",
		stripped: false,
	},
	{
		strip:    []string{},
		keep:     []string{},
		stripRe:  []string{},
		keepRe:   []string{"default-.+"},
		receiver: "foo-bar",
		stripped: true,
	},
	{
		strip:    []string{},
		keep:     []string{"default-foo"},
		stripRe:  []string{"default-.+"},
		keepRe:   []string{},
		receiver: "default-foo",
		stripped: true,
	},
}

func TestStripReceivers(t *testing.T) {
	for _, testCase := range stripReceiverTests {
		keepRegex := getCompiledRegex(testCase.keepRe, t)
		stripRegex := getCompiledRegex(testCase.keepRe, t)
		stripped := transform.StripReceivers(testCase.keep, testCase.strip, keepRegex, stripRegex, testCase.receiver)
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
