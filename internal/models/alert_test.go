package models_test

import (
	"fmt"
	"sort"
	"strings"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"

	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/models"
)

func labelsToString(ls models.Labels) string {
	s := make([]string, 0, len(ls))
	for _, l := range ls {
		s = append(s, fmt.Sprintf("%s=\"%s\"", l.Name.Value(), l.Value.Value()))
	}
	return strings.Join(s, ",")
}

func TestLabelsSet(t *testing.T) {
	l := models.Labels{}
	if labelsToString(l) != "" {
		t.Errorf("Invalid labels: %+v", l)
	}

	l = l.Set("foo", "bar")
	if labelsToString(l) != `foo="bar"` {
		t.Errorf("Invalid labels: %+v", l)
	}

	l = l.Set("foo", "bar")
	if labelsToString(l) != `foo="bar"` {
		t.Errorf("Invalid labels: %+v", l)
	}

	l = l.Set("bar", "foo")
	if labelsToString(l) != `foo="bar",bar="foo"` {
		t.Errorf("Invalid labels: %+v", l)
	}

	l = l.Set("bar", "foo")
	if labelsToString(l) != `foo="bar",bar="foo"` {
		t.Errorf("Invalid labels: %+v", l)
	}

	l = l.Set("foo", "bar")
	if labelsToString(l) != `foo="bar",bar="foo"` {
		t.Errorf("Invalid labels: %+v", l)
	}
}

type sortLabelsTestCase struct {
	order []string
	in    models.Labels
	out   models.Labels
}

func TestSortLabels(t *testing.T) {
	testCases := []sortLabelsTestCase{
		{
			order: []string{},
			in: models.Labels{
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
			},
			out: models.Labels{
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
			},
		},
		{
			order: []string{},
			in: models.Labels{
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
				{Name: models.NewUniqueString("bar"), Value: models.NewUniqueString("foo")},
			},
			out: models.Labels{
				{Name: models.NewUniqueString("bar"), Value: models.NewUniqueString("foo")},
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
			},
		},
		{
			order: []string{},
			in: models.Labels{
				{Name: models.NewUniqueString("bar"), Value: models.NewUniqueString("foo")},
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
			},
			out: models.Labels{
				{Name: models.NewUniqueString("bar"), Value: models.NewUniqueString("foo")},
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
			},
		},
		{
			order: []string{},
			in: models.Labels{
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("foo")},
				{Name: models.NewUniqueString("bar"), Value: models.NewUniqueString("foo")},
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
			},
			out: models.Labels{
				{Name: models.NewUniqueString("bar"), Value: models.NewUniqueString("foo")},
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("foo")},
			},
		},
		{
			order: []string{},
			in: models.Labels{
				{Name: models.NewUniqueString("1"), Value: models.NewUniqueString("a12")},
				{Name: models.NewUniqueString("1"), Value: models.NewUniqueString("1")},
				{Name: models.NewUniqueString("1"), Value: models.NewUniqueString("a2")},
			},
			out: models.Labels{
				{Name: models.NewUniqueString("1"), Value: models.NewUniqueString("1")},
				{Name: models.NewUniqueString("1"), Value: models.NewUniqueString("a2")},
				{Name: models.NewUniqueString("1"), Value: models.NewUniqueString("a12")},
			},
		},
		{
			order: []string{"bar"},
			in: models.Labels{
				{Name: models.NewUniqueString("baz"), Value: models.NewUniqueString("1")},
				{Name: models.NewUniqueString("bar"), Value: models.NewUniqueString("1")},
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("1")},
			},
			out: models.Labels{
				{Name: models.NewUniqueString("bar"), Value: models.NewUniqueString("1")},
				{Name: models.NewUniqueString("baz"), Value: models.NewUniqueString("1")},
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("1")},
			},
		},
		{
			order: []string{"foo", "bar"},
			in: models.Labels{
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("a10")},
				{Name: models.NewUniqueString("bar"), Value: models.NewUniqueString("1")},
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("a3")},
			},
			out: models.Labels{
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("a3")},
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("a10")},
				{Name: models.NewUniqueString("bar"), Value: models.NewUniqueString("1")},
			},
		},
	}

	defer func() {
		config.Config.Labels.Order = []string{}
	}()

	for i, testCase := range testCases {
		t.Run(fmt.Sprintf("[%d] order=%v", i, testCase.order), func(t *testing.T) {
			config.Config.Labels.Order = testCase.order
			sort.Sort(testCase.in)
			if diff := cmp.Diff(testCase.in, testCase.out, cmpopts.EquateComparable(models.Label{})); diff != "" {
				t.Errorf("Incorrectly sorted labels (-want +got):\n%s", diff)
				t.FailNow()
			}
		})
	}
}
