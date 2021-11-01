package models_test

import (
	"fmt"
	"sort"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/models"
)

func TestLabelsSet(t *testing.T) {
	l := models.Labels{}
	if l.String() != "" {
		t.Errorf("Invalid labels: %s", l)
	}

	l = l.Set("foo", "bar")
	if l.String() != `foo="bar"` {
		t.Errorf("Invalid labels: %s", l)
	}

	l = l.Set("foo", "bar")
	if l.String() != `foo="bar"` {
		t.Errorf("Invalid labels: %s", l)
	}

	l = l.Set("bar", "foo")
	if l.String() != `foo="bar",bar="foo"` {
		t.Errorf("Invalid labels: %s", l)
	}

	l = l.Set("bar", "foo")
	if l.String() != `foo="bar",bar="foo"` {
		t.Errorf("Invalid labels: %s", l)
	}

	l = l.Set("foo", "bar")
	if l.String() != `foo="bar",bar="foo"` {
		t.Errorf("Invalid labels: %s", l)
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
				{Name: "foo", Value: "bar"},
			},
			out: models.Labels{
				{Name: "foo", Value: "bar"},
			},
		},
		{
			order: []string{},
			in: models.Labels{
				{Name: "foo", Value: "bar"},
				{Name: "bar", Value: "foo"},
			},
			out: models.Labels{
				{Name: "bar", Value: "foo"},
				{Name: "foo", Value: "bar"},
			},
		},
		{
			order: []string{},
			in: models.Labels{
				{Name: "bar", Value: "foo"},
				{Name: "foo", Value: "bar"},
			},
			out: models.Labels{
				{Name: "bar", Value: "foo"},
				{Name: "foo", Value: "bar"},
			},
		},
		{
			order: []string{},
			in: models.Labels{
				{Name: "foo", Value: "foo"},
				{Name: "bar", Value: "foo"},
				{Name: "foo", Value: "bar"},
			},
			out: models.Labels{
				{Name: "bar", Value: "foo"},
				{Name: "foo", Value: "bar"},
				{Name: "foo", Value: "foo"},
			},
		},
		{
			order: []string{},
			in: models.Labels{
				{Name: "1", Value: "a12"},
				{Name: "1", Value: "1"},
				{Name: "1", Value: "a2"},
			},
			out: models.Labels{
				{Name: "1", Value: "1"},
				{Name: "1", Value: "a2"},
				{Name: "1", Value: "a12"},
			},
		},
		{
			order: []string{"bar"},
			in: models.Labels{
				{Name: "baz", Value: "1"},
				{Name: "bar", Value: "1"},
				{Name: "foo", Value: "1"},
			},
			out: models.Labels{
				{Name: "bar", Value: "1"},
				{Name: "baz", Value: "1"},
				{Name: "foo", Value: "1"},
			},
		},
		{
			order: []string{"foo", "bar"},
			in: models.Labels{
				{Name: "foo", Value: "a10"},
				{Name: "bar", Value: "1"},
				{Name: "foo", Value: "a3"},
			},
			out: models.Labels{
				{Name: "foo", Value: "a3"},
				{Name: "foo", Value: "a10"},
				{Name: "bar", Value: "1"},
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
			if diff := cmp.Diff(testCase.in, testCase.out); diff != "" {
				t.Errorf("Incorrectly sorted labels (-want +got):\n%s", diff)
				t.FailNow()
			}
		})
	}
}
