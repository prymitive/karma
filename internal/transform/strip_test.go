package transform_test

import (
	"fmt"
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
			{Name: models.NewUniqueString("host"), Value: models.NewUniqueString("localhost")},
			{Name: models.NewUniqueString("env"), Value: models.NewUniqueString("production")},
			{Name: models.NewUniqueString("level"), Value: models.NewUniqueString("info")},
		},
		after: models.Labels{
			{Name: models.NewUniqueString("host"), Value: models.NewUniqueString("localhost")},
			{Name: models.NewUniqueString("level"), Value: models.NewUniqueString("info")},
		},
	},
	{
		strip:      []string{"server"},
		keep:       []string{},
		stripRegex: []string{},
		keepRegex:  []string{},
		before: models.Labels{
			{Name: models.NewUniqueString("host"), Value: models.NewUniqueString("localhost")},
			{Name: models.NewUniqueString("env"), Value: models.NewUniqueString("production")},
			{Name: models.NewUniqueString("level"), Value: models.NewUniqueString("info")},
		},
		after: models.Labels{
			{Name: models.NewUniqueString("env"), Value: models.NewUniqueString("production")},
			{Name: models.NewUniqueString("host"), Value: models.NewUniqueString("localhost")},
			{Name: models.NewUniqueString("level"), Value: models.NewUniqueString("info")},
		},
	},
	{
		strip:      []string{},
		keep:       []string{},
		stripRegex: []string{},
		keepRegex:  []string{},
		before: models.Labels{
			{Name: models.NewUniqueString("env"), Value: models.NewUniqueString("production")},
			{Name: models.NewUniqueString("host"), Value: models.NewUniqueString("localhost")},
			{Name: models.NewUniqueString("level"), Value: models.NewUniqueString("info")},
		},
		after: models.Labels{
			{Name: models.NewUniqueString("env"), Value: models.NewUniqueString("production")},
			{Name: models.NewUniqueString("host"), Value: models.NewUniqueString("localhost")},
			{Name: models.NewUniqueString("level"), Value: models.NewUniqueString("info")},
		},
	},
	{
		strip:      []string{"host"},
		keep:       []string{},
		stripRegex: []string{},
		keepRegex:  []string{},
		before: models.Labels{
			{Name: models.NewUniqueString("host"), Value: models.NewUniqueString("localhost")},
		},
		after: models.Labels{},
	},
	{
		strip:      []string{},
		keep:       []string{"env"},
		stripRegex: []string{},
		keepRegex:  []string{},
		before: models.Labels{
			{Name: models.NewUniqueString("host"), Value: models.NewUniqueString("localhost")},
			{Name: models.NewUniqueString("env"), Value: models.NewUniqueString("production")},
			{Name: models.NewUniqueString("level"), Value: models.NewUniqueString("info")},
		},
		after: models.Labels{
			{Name: models.NewUniqueString("env"), Value: models.NewUniqueString("production")},
		},
	},
	{
		strip:      []string{"env"},
		keep:       []string{"host"},
		stripRegex: []string{},
		keepRegex:  []string{},
		before: models.Labels{
			{Name: models.NewUniqueString("host"), Value: models.NewUniqueString("localhost")},
			{Name: models.NewUniqueString("env"), Value: models.NewUniqueString("production")},
			{Name: models.NewUniqueString("level"), Value: models.NewUniqueString("info")},
		},
		after: models.Labels{
			{Name: models.NewUniqueString("host"), Value: models.NewUniqueString("localhost")},
		},
	},
	{
		strip:      []string{},
		keep:       []string{"env"},
		stripRegex: []string{},
		keepRegex:  []string{},
		before: models.Labels{
			{Name: models.NewUniqueString("host"), Value: models.NewUniqueString("localhost")},
			{Name: models.NewUniqueString("level"), Value: models.NewUniqueString("info")},
		},
		after: models.Labels{},
	},
	{
		strip:      []string{},
		keep:       []string{},
		stripRegex: []string{".*e.*"},
		keepRegex:  []string{},
		before: models.Labels{
			{Name: models.NewUniqueString("host"), Value: models.NewUniqueString("localhost")},
			{Name: models.NewUniqueString("env"), Value: models.NewUniqueString("production")},
			{Name: models.NewUniqueString("level"), Value: models.NewUniqueString("info")},
		},
		after: models.Labels{
			{Name: models.NewUniqueString("host"), Value: models.NewUniqueString("localhost")},
		},
	},
	{
		strip:      []string{},
		keep:       []string{},
		stripRegex: []string{},
		keepRegex:  []string{".*e.*"},
		before: models.Labels{
			{Name: models.NewUniqueString("host"), Value: models.NewUniqueString("localhost")},
			{Name: models.NewUniqueString("env"), Value: models.NewUniqueString("production")},
			{Name: models.NewUniqueString("level"), Value: models.NewUniqueString("info")},
		},
		after: models.Labels{
			{Name: models.NewUniqueString("env"), Value: models.NewUniqueString("production")},
			{Name: models.NewUniqueString("level"), Value: models.NewUniqueString("info")},
		},
	},
	{
		strip:      []string{},
		keep:       []string{"env", "level"},
		stripRegex: []string{".*el"},
		keepRegex:  []string{},
		before: models.Labels{
			{Name: models.NewUniqueString("host"), Value: models.NewUniqueString("localhost")},
			{Name: models.NewUniqueString("env"), Value: models.NewUniqueString("production")},
			{Name: models.NewUniqueString("level"), Value: models.NewUniqueString("info")},
		},
		after: models.Labels{
			{Name: models.NewUniqueString("env"), Value: models.NewUniqueString("production")},
		},
	},
	{
		strip:      []string{"level"},
		keep:       []string{},
		stripRegex: []string{},
		keepRegex:  []string{".*e.*"},
		before: models.Labels{
			{Name: models.NewUniqueString("host"), Value: models.NewUniqueString("localhost")},
			{Name: models.NewUniqueString("env"), Value: models.NewUniqueString("production")},
			{Name: models.NewUniqueString("level"), Value: models.NewUniqueString("info")},
		},
		after: models.Labels{
			{Name: models.NewUniqueString("env"), Value: models.NewUniqueString("production")},
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
	receiver string
	strip    []string
	keep     []string
	stripRe  []string
	keepRe   []string
	stripped bool
}

var stripReceiverTests = []stripReceiverTest{
	{
		keep:     []string{},
		keepRe:   []string{},
		strip:    []string{},
		stripRe:  []string{},
		receiver: "default",
		stripped: false,
	},
	{
		keep:     []string{},
		keepRe:   []string{},
		strip:    []string{"default"},
		stripRe:  []string{},
		receiver: "default",
		stripped: true,
	},
	{
		keep:     []string{"default"},
		keepRe:   []string{},
		strip:    []string{"default"},
		stripRe:  []string{},
		receiver: "default",
		stripped: true,
	},
	{
		keep:     []string{"default"},
		keepRe:   []string{},
		strip:    []string{},
		stripRe:  []string{},
		receiver: "default",
		stripped: false,
	},
	{
		keep:     []string{},
		keepRe:   []string{},
		strip:    []string{"foo", "bar"},
		stripRe:  []string{},
		receiver: "default",
		stripped: false,
	},
	{
		keep:     []string{"foo", "bar"},
		keepRe:   []string{},
		strip:    []string{"foo", "default"},
		stripRe:  []string{},
		receiver: "default",
		stripped: true,
	},
	{
		keep:     []string{},
		keepRe:   []string{"default-.+"},
		strip:    []string{},
		stripRe:  []string{},
		receiver: "default-foo",
		stripped: false,
	},
	{
		keep:     []string{},
		keepRe:   []string{"default-.+"},
		strip:    []string{},
		stripRe:  []string{".+"},
		receiver: "foo-bar",
		stripped: true,
	},
	{
		keep:     []string{"default-foo"},
		keepRe:   []string{},
		strip:    []string{},
		stripRe:  []string{"default-.+"},
		receiver: "default-foo",
		stripped: true,
	},
}

func TestStripReceivers(t *testing.T) {
	for _, testCase := range stripReceiverTests {
		t.Run(
			fmt.Sprintf("keep=%v keep_re=%v strip=%v strip_re=%s receiver=%s",
				testCase.keep, testCase.keepRe, testCase.strip, testCase.stripRe, testCase.receiver), func(t *testing.T) {
				keepRegex := getCompiledRegex(testCase.keepRe, t)
				stripRegex := getCompiledRegex(testCase.stripRe, t)
				stripped := transform.StripReceivers(testCase.keep, testCase.strip, keepRegex, stripRegex, testCase.receiver)
				if stripped != testCase.stripped {
					t.Errorf("StripReceivers failed, expected %v, got %v", testCase.stripped, stripped)
				}
			})
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
			models.Annotation{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
		},
		after: models.Annotations{
			models.Annotation{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
		},
	},
	{
		strip: []string{"foo"},
		keep:  []string{},
		before: models.Annotations{
			models.Annotation{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
		},
		after: models.Annotations{},
	},
	{
		strip: []string{"foo"},
		keep:  []string{},
		before: models.Annotations{
			models.Annotation{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
			models.Annotation{Name: models.NewUniqueString("boo"), Value: models.NewUniqueString("baz")},
		},
		after: models.Annotations{
			models.Annotation{Name: models.NewUniqueString("boo"), Value: models.NewUniqueString("baz")},
		},
	},
	{
		strip: []string{},
		keep:  []string{"foo"},
		before: models.Annotations{
			models.Annotation{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
		},
		after: models.Annotations{
			models.Annotation{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
		},
	},
	{
		strip: []string{},
		keep:  []string{"foo"},
		before: models.Annotations{
			models.Annotation{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
			models.Annotation{Name: models.NewUniqueString("boo"), Value: models.NewUniqueString("baz")},
		},
		after: models.Annotations{
			models.Annotation{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
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
