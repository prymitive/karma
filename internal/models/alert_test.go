package models_test

import (
	"encoding/json"
	"fmt"
	"slices"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/prometheus/prometheus/model/labels"

	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/models"
)

func TestLabelsSetIfMissing(t *testing.T) {
	// verifies that LabelsSetIfMissing adds a label when missing
	l := labels.EmptyLabels()
	l = models.LabelsSetIfMissing(l, "foo", "bar")
	if l.Get("foo") != "bar" {
		t.Errorf("Expected foo=bar, got foo=%s", l.Get("foo"))
	}

	// verifies that LabelsSetIfMissing does not overwrite an existing label
	l = models.LabelsSetIfMissing(l, "foo", "baz")
	if l.Get("foo") != "bar" {
		t.Errorf("Expected foo=bar (unchanged), got foo=%s", l.Get("foo"))
	}

	// verifies that LabelsSetIfMissing adds a second label
	l = models.LabelsSetIfMissing(l, "bar", "foo")
	if l.Get("bar") != "foo" {
		t.Errorf("Expected bar=foo, got bar=%s", l.Get("bar"))
	}
	if l.Get("foo") != "bar" {
		t.Errorf("Expected foo=bar (still), got foo=%s", l.Get("foo"))
	}
}

type sortOrderedLabelsTestCase struct {
	order []string
	in    models.OrderedLabels
	out   models.OrderedLabels
}

func TestSortOrderedLabels(t *testing.T) {
	testCases := []sortOrderedLabelsTestCase{
		// verifies that a single label stays in place
		{
			order: []string{},
			in:    models.OrderedLabels{{Name: "foo", Value: "bar"}},
			out:   models.OrderedLabels{{Name: "foo", Value: "bar"}},
		},
		// verifies that two labels are sorted alphabetically by name
		{
			order: []string{},
			in: models.OrderedLabels{
				{Name: "foo", Value: "bar"},
				{Name: "bar", Value: "foo"},
			},
			out: models.OrderedLabels{
				{Name: "bar", Value: "foo"},
				{Name: "foo", Value: "bar"},
			},
		},
		// verifies that already-sorted labels remain stable
		{
			order: []string{},
			in: models.OrderedLabels{
				{Name: "bar", Value: "foo"},
				{Name: "foo", Value: "bar"},
			},
			out: models.OrderedLabels{
				{Name: "bar", Value: "foo"},
				{Name: "foo", Value: "bar"},
			},
		},
		// verifies that same-name labels sort by value naturally
		{
			order: []string{},
			in: models.OrderedLabels{
				{Name: "foo", Value: "foo"},
				{Name: "bar", Value: "foo"},
				{Name: "foo", Value: "bar"},
			},
			out: models.OrderedLabels{
				{Name: "bar", Value: "foo"},
				{Name: "foo", Value: "bar"},
				{Name: "foo", Value: "foo"},
			},
		},
		// verifies natural sort on values with numbers
		{
			order: []string{},
			in: models.OrderedLabels{
				{Name: "1", Value: "a12"},
				{Name: "1", Value: "1"},
				{Name: "1", Value: "a2"},
			},
			out: models.OrderedLabels{
				{Name: "1", Value: "1"},
				{Name: "1", Value: "a2"},
				{Name: "1", Value: "a12"},
			},
		},
		// verifies that configured order takes priority
		{
			order: []string{"bar"},
			in: models.OrderedLabels{
				{Name: "baz", Value: "1"},
				{Name: "bar", Value: "1"},
				{Name: "foo", Value: "1"},
			},
			out: models.OrderedLabels{
				{Name: "bar", Value: "1"},
				{Name: "baz", Value: "1"},
				{Name: "foo", Value: "1"},
			},
		},
		// verifies that multiple order entries sort correctly with natural value sort
		{
			order: []string{"foo", "bar"},
			in: models.OrderedLabels{
				{Name: "foo", Value: "a10"},
				{Name: "bar", Value: "1"},
				{Name: "foo", Value: "a3"},
			},
			out: models.OrderedLabels{
				{Name: "foo", Value: "a3"},
				{Name: "foo", Value: "a10"},
				{Name: "bar", Value: "1"},
			},
		},
		// verifies that identical labels stay in their original positions
		{
			order: []string{},
			in: models.OrderedLabels{
				{Name: "foo", Value: "bar"},
				{Name: "foo", Value: "bar"},
			},
			out: models.OrderedLabels{
				{Name: "foo", Value: "bar"},
				{Name: "foo", Value: "bar"},
			},
		},
		// verifies that same-name labels with different values sort by value naturally
		{
			order: []string{},
			in: models.OrderedLabels{
				{Name: "foo", Value: "z"},
				{Name: "foo", Value: "a"},
			},
			out: models.OrderedLabels{
				{Name: "foo", Value: "a"},
				{Name: "foo", Value: "z"},
			},
		},
		// verifies that labels with different names sort by name naturally
		{
			order: []string{},
			in: models.OrderedLabels{
				{Name: "zzz", Value: "1"},
				{Name: "aaa", Value: "1"},
			},
			out: models.OrderedLabels{
				{Name: "aaa", Value: "1"},
				{Name: "zzz", Value: "1"},
			},
		},
	}

	defer func() {
		config.Config.Labels.Order = []string{}
	}()

	for i, testCase := range testCases {
		t.Run(fmt.Sprintf("[%d] order=%v", i, testCase.order), func(t *testing.T) {
			config.Config.Labels.Order = testCase.order
			slices.SortFunc(testCase.in, models.CompareOrderedLabels)
			if diff := cmp.Diff(testCase.out, testCase.in); diff != "" {
				t.Errorf("Incorrectly sorted labels (-want +got):\n%s", diff)
				t.FailNow()
			}
		})
	}
}

func TestLabelsMap(t *testing.T) {
	type testCaseT struct {
		labels   labels.Labels
		expected map[string]string
	}

	testCases := []testCaseT{
		// verifies that empty labels produce an empty map
		{
			labels:   labels.EmptyLabels(),
			expected: map[string]string{},
		},
		// verifies that labels are converted to a name->value map
		{
			labels:   labels.FromStrings("baz", "qux", "foo", "bar"),
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

func TestLabelsGet(t *testing.T) {
	ls := labels.FromStrings("baz", "qux", "foo", "bar")

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
		result := ls.Get(tc.name)
		if result != tc.expected {
			t.Errorf("Labels.Get(%q) returned %q, expected %q", tc.name, result, tc.expected)
		}
	}
}

func TestAlertStateJSONRoundTrip(t *testing.T) {
	// verifies that AlertState survives a JSON marshal/unmarshal round-trip
	original := models.AlertStateActive
	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("json.Marshal failed: %s", err)
	}
	if string(data) != `"active"` {
		t.Errorf("json.Marshal produced %s, expected %q", string(data), `"active"`)
	}

	var decoded models.AlertState
	err = json.Unmarshal(data, &decoded)
	if err != nil {
		t.Fatalf("json.Unmarshal failed: %s", err)
	}
	if decoded != models.AlertStateActive {
		t.Errorf("json.Unmarshal produced %v, expected %v", decoded, models.AlertStateActive)
	}
}

func TestAlertStateUnmarshalJSONError(t *testing.T) {
	// verifies that UnmarshalJSON returns an error for invalid JSON input
	var s models.AlertState
	err := json.Unmarshal([]byte(`{invalid`), &s)
	if err == nil {
		t.Error("json.Unmarshal should have returned an error for invalid JSON")
	}
}

func TestUpdateFingerprints(t *testing.T) {
	// verifies that UpdateFingerprints produces stable, non-empty fingerprints
	// including the alertmanager instance, silenced-by, and inhibited-by branches
	alert := models.Alert{
		StartsAt:    time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC),
		State:       models.AlertStateActive,
		Receiver:    "default",
		Fingerprint: "abc123",
		Labels:      labels.FromStrings("alertname", "TestAlert"),
		Annotations: models.Annotations{
			{
				Name:     "summary",
				Value:    "test summary",
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
				State:       models.AlertStateActive,
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
	alert2.Labels = labels.FromStrings("alertname", "DifferentAlert")
	alert2.UpdateFingerprints()
	if alert2.LabelsFingerprint() == fp1 {
		t.Error("LabelsFingerprint() should differ when labels change")
	}
}

func TestLabelsToOrderedLabels(t *testing.T) {
	// verifies that LabelsToOrderedLabels converts labels and applies display ordering
	defer func() {
		config.Config.Labels.Order = []string{}
	}()

	config.Config.Labels.Order = []string{"alertname"}
	ls := labels.FromStrings("alertname", "TestAlert", "job", "node")
	dl := models.LabelsToOrderedLabels(ls)

	expected := models.OrderedLabels{
		{Name: "alertname", Value: "TestAlert"},
		{Name: "job", Value: "node"},
	}
	if diff := cmp.Diff(expected, dl); diff != "" {
		t.Errorf("LabelsToOrderedLabels mismatch (-want +got):\n%s", diff)
	}
}

func TestLabelsFromMap(t *testing.T) {
	// verifies that LabelsFromMap creates labels from a map
	m := map[string]string{"foo": "bar", "baz": "qux"}
	ls := models.LabelsFromMap(m)
	if ls.Get("foo") != "bar" {
		t.Errorf("Expected foo=bar, got foo=%s", ls.Get("foo"))
	}
	if ls.Get("baz") != "qux" {
		t.Errorf("Expected baz=qux, got baz=%s", ls.Get("baz"))
	}
}
