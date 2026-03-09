package models_test

import (
	"encoding/json"
	"fmt"
	"slices"
	"strings"
	"testing"
	"time"

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
		// verifies that identical labels stay in their original positions
		{
			order: []string{},
			in: models.Labels{
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
			},
			out: models.Labels{
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
			},
		},
		// verifies that same-name labels with different values sort by value descending naturally
		{
			order: []string{},
			in: models.Labels{
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("z")},
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("a")},
			},
			out: models.Labels{
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("a")},
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("z")},
			},
		},
		// verifies that completely identical name labels (no order config) with equal names sort by name naturally
		{
			order: []string{},
			in: models.Labels{
				{Name: models.NewUniqueString("zzz"), Value: models.NewUniqueString("1")},
				{Name: models.NewUniqueString("aaa"), Value: models.NewUniqueString("1")},
			},
			out: models.Labels{
				{Name: models.NewUniqueString("aaa"), Value: models.NewUniqueString("1")},
				{Name: models.NewUniqueString("zzz"), Value: models.NewUniqueString("1")},
			},
		},
	}

	defer func() {
		config.Config.Labels.Order = []string{}
	}()

	for i, testCase := range testCases {
		t.Run(fmt.Sprintf("[%d] order=%v", i, testCase.order), func(t *testing.T) {
			config.Config.Labels.Order = testCase.order
			slices.SortFunc(testCase.in, models.CompareLabels)
			if diff := cmp.Diff(testCase.in, testCase.out, cmpopts.EquateComparable(models.Label{})); diff != "" {
				t.Errorf("Incorrectly sorted labels (-want +got):\n%s", diff)
				t.FailNow()
			}
		})
	}
}

func TestLabelsMap(t *testing.T) {
	type testCaseT struct {
		labels   models.Labels
		expected map[string]string
	}

	testCases := []testCaseT{
		// verifies that empty labels produce an empty map
		{
			labels:   models.Labels{},
			expected: map[string]string{},
		},
		// verifies that labels are converted to a name->value map
		{
			labels: models.Labels{
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
				{Name: models.NewUniqueString("baz"), Value: models.NewUniqueString("qux")},
			},
			expected: map[string]string{"foo": "bar", "baz": "qux"},
		},
	}

	for _, tc := range testCases {
		result := tc.labels.Map()
		if diff := cmp.Diff(tc.expected, result); diff != "" {
			t.Errorf("Labels.Map() mismatch (-want +got):\n%s", diff)
		}
	}
}

func TestLabelsGetValue(t *testing.T) {
	labels := models.Labels{
		{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
		{Name: models.NewUniqueString("baz"), Value: models.NewUniqueString("qux")},
	}

	type testCaseT struct {
		name     string
		expected string
	}

	testCases := []testCaseT{
		// verifies that an existing label returns its value
		{name: "foo", expected: "bar"},
		// verifies that another existing label returns its value
		{name: "baz", expected: "qux"},
		// verifies that a missing label returns an empty string
		{name: "missing", expected: ""},
	}

	for _, tc := range testCases {
		result := labels.GetValue(tc.name)
		if result != tc.expected {
			t.Errorf("Labels.GetValue(%q) returned %q, expected %q", tc.name, result, tc.expected)
		}
	}
}

func TestUniqueStringJSONRoundTrip(t *testing.T) {
	// verifies that UniqueString survives a JSON marshal/unmarshal round-trip
	original := models.NewUniqueString("test_value")
	data, err := json.Marshal(&original)
	if err != nil {
		t.Fatalf("json.Marshal failed: %s", err)
	}
	if string(data) != `"test_value"` {
		t.Errorf("json.Marshal produced %s, expected %q", string(data), `"test_value"`)
	}

	var decoded models.UniqueString
	err = json.Unmarshal(data, &decoded)
	if err != nil {
		t.Fatalf("json.Unmarshal failed: %s", err)
	}
	if decoded.Value() != "test_value" {
		t.Errorf("json.Unmarshal produced %q, expected %q", decoded.Value(), "test_value")
	}
}

func TestUniqueStringUnmarshalJSONError(t *testing.T) {
	// verifies that UnmarshalJSON returns an error for invalid JSON input
	var us models.UniqueString
	err := json.Unmarshal([]byte(`{invalid`), &us)
	if err == nil {
		t.Error("json.Unmarshal should have returned an error for invalid JSON")
	}
}

func TestUpdateFingerprints(t *testing.T) {
	// verifies that UpdateFingerprints produces stable, non-empty fingerprints
	// including the alertmanager instance, silenced-by, and inhibited-by branches
	alert := models.Alert{
		StartsAt:    time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC),
		State:       models.NewUniqueString("active"),
		Receiver:    models.NewUniqueString("default"),
		Fingerprint: "abc123",
		Labels: models.Labels{
			{Name: models.NewUniqueString("alertname"), Value: models.NewUniqueString("TestAlert")},
		},
		Annotations: models.Annotations{
			{
				Name:     models.NewUniqueString("summary"),
				Value:    models.NewUniqueString("test summary"),
				Visible:  true,
				IsLink:   false,
				IsAction: false,
			},
		},
		Alertmanager: []models.AlertmanagerInstance{
			{
				Fingerprint: "fp1",
				Name:        "am1",
				Cluster:     "cluster1",
				State:       models.NewUniqueString("active"),
				StartsAt:    time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC),
				Source:      "http://source",
				SilencedBy:  []string{"silence1", "silence2"},
				InhibitedBy: []string{"inhibit1"},
			},
		},
	}

	alert.UpdateFingerprints()

	if alert.LabelsFingerprint() == "" {
		t.Error("LabelsFingerprint() returned empty string after UpdateFingerprints()")
	}
	if alert.ContentFingerprint() == "" {
		t.Error("ContentFingerprint() returned empty string after UpdateFingerprints()")
	}

	// verifies that calling UpdateFingerprints again produces the same result
	fp1 := alert.LabelsFingerprint()
	cfp1 := alert.ContentFingerprint()
	alert.UpdateFingerprints()
	if alert.LabelsFingerprint() != fp1 {
		t.Errorf("LabelsFingerprint() not stable: %q != %q", alert.LabelsFingerprint(), fp1)
	}
	if alert.ContentFingerprint() != cfp1 {
		t.Errorf("ContentFingerprint() not stable: %q != %q", alert.ContentFingerprint(), cfp1)
	}

	// verifies that changing a label produces a different fingerprint
	alert2 := alert
	alert2.Labels = models.Labels{
		{Name: models.NewUniqueString("alertname"), Value: models.NewUniqueString("DifferentAlert")},
	}
	alert2.UpdateFingerprints()
	if alert2.LabelsFingerprint() == fp1 {
		t.Error("LabelsFingerprint() should differ when labels change")
	}
}
