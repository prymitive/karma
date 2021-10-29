package models_test

import (
	"sort"
	"testing"

	"github.com/google/go-cmp/cmp"
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
	in  models.Labels
	out models.Labels
}

func TestSortLabels(t *testing.T) {
	testCases := []sortLabelsTestCase{
		{
			in: models.Labels{
				{Name: "foo", Value: "bar"},
			},
			out: models.Labels{
				{Name: "foo", Value: "bar"},
			},
		},
		{
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
	}

	for _, testCase := range testCases {
		sort.Sort(testCase.in)
		if diff := cmp.Diff(testCase.in, testCase.out); diff != "" {
			t.Errorf("Incorrectly sorted labels (-want +got):\n%s", diff)
			break
		}
	}
}
