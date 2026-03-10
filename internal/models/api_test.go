package models_test

import (
	"bytes"
	"encoding/json"
	"slices"
	"testing"

	"github.com/beme/abide"
	"github.com/prometheus/prometheus/model/labels"

	"github.com/prymitive/karma/internal/models"
)

func TestColorString(t *testing.T) {
	type testCaseT struct {
		color    models.Color
		expected string
	}

	testCases := []testCaseT{
		// verifies zero-value color produces all zeros
		{
			color:    models.Color{Red: 0, Green: 0, Blue: 0, Alpha: 0},
			expected: "rgba(0,0,0,0)",
		},
		// verifies max-value color produces all 255s
		{
			color:    models.Color{Red: 255, Green: 255, Blue: 255, Alpha: 255},
			expected: "rgba(255,255,255,255)",
		},
		// verifies mixed values are formatted correctly
		{
			color:    models.Color{Red: 10, Green: 20, Blue: 30, Alpha: 128},
			expected: "rgba(10,20,30,128)",
		},
	}

	for _, tc := range testCases {
		result := tc.color.String()
		if result != tc.expected {
			t.Errorf("Color.String() returned %q, expected %q", result, tc.expected)
		}
	}
}

func TestDedupSharedMaps(t *testing.T) {
	ag := models.AlertGroup{
		Receiver: "default",
		Labels:   labels.FromStrings("alertname", "FakeAlert"),
		Alerts: models.AlertList{
			models.Alert{
				Receiver: "default",
				State:    models.AlertStateSuppressed,
				Annotations: models.Annotations{
					models.Annotation{
						Name:  "summary",
						Value: "this is summary",
					},
					models.Annotation{
						Name:  "foo",
						Value: "bar",
					},
				},
				Labels: labels.FromStrings("alertname", "FakeAlert", "instance", "1", "job", "node_exporter"),
				Alertmanager: []models.AlertmanagerInstance{
					{
						State:       models.AlertStateSuppressed,
						Fingerprint: "1",
						Name:        "am1",
						Cluster:     "fakeCluster",
						SilencedBy:  []string{"fakeSilence1", "fakeSilence2"},
						Source:      "https://prom.example.com/graph?foo",
					},
					{
						State:       models.AlertStateSuppressed,
						Fingerprint: "2",
						Name:        "am2",
						Cluster:     "fakeCluster",
						SilencedBy:  []string{"fakeSilence1", "fakeSilence2"},
						Source:      "https://prom.example.com/subdir/graph?bar",
					},
				},
			},
			models.Alert{
				Receiver: "default",
				State:    models.AlertStateActive,
				Annotations: models.Annotations{
					models.Annotation{
						Name:  "summary",
						Value: "this is summary",
					},
				},
				Labels: labels.FromStrings("alertname", "FakeAlert", "instance", "2", "job", "node_exporter"),
				Alertmanager: []models.AlertmanagerInstance{
					{
						State:       models.AlertStateActive,
						Fingerprint: "1",
						Name:        "am1",
						Cluster:     "fakeCluster",
						SilencedBy:  []string{"fakeSilence1", "fakeSilence2"},
						Source:      "https://am.example.com",
					},
					{
						State:       models.AlertStateActive,
						Fingerprint: "1",
						Name:        "am2",
						Cluster:     "fakeCluster",
						SilencedBy:  []string{"fakeSilence1", "fakeSilence2"},
						Source:      "https://am.example.com",
					},
				},
			},
			models.Alert{
				Receiver: "default",
				State:    models.AlertStateSuppressed,
				Annotations: models.Annotations{
					models.Annotation{
						Name:  "summary",
						Value: "this is summary",
					},
				},
				Labels: labels.FromStrings("alertname", "FakeAlert", "extra", "ignore", "instance", "3", "job", "blackbox"),
				Alertmanager: []models.AlertmanagerInstance{
					{
						State:       models.AlertStateSuppressed,
						Fingerprint: "1",
						Name:        "am1",
						Cluster:     "fakeCluster",
						SilencedBy:  []string{"fakeSilence1", "fakeSilence2"},
						Source:      "https://am.example.com/graph",
					},
					{
						State:       models.AlertStateSuppressed,
						Fingerprint: "1",
						Name:        "am2",
						Cluster:     "fakeCluster",
						SilencedBy:  []string{"fakeSilence1", "fakeSilence2"},
						Source:      "https://am.example.com/graph",
					},
				},
			},
		},
	}
	shared, allLabels := ag.DedupSharedMaps(nil)
	apiAG := models.NewAPIAlertGroup(ag, shared, allLabels, len(ag.Alerts))

	agJSON, _ := json.MarshalIndent(apiAG, "", "  ")
	abide.AssertReader(t, "SharedMaps", bytes.NewReader(agJSON))
}

func TestDedupSharedMapsSingleGroup(t *testing.T) {
	ag := models.AlertGroup{
		Alerts: models.AlertList{
			models.Alert{
				State:  models.AlertStateActive,
				Labels: labels.FromStrings("foo", "bar"),
			},
			models.Alert{
				State:  models.AlertStateUnprocessed,
				Labels: labels.FromStrings("foo", "bar"),
			},
		},
	}
	shared, _ := ag.DedupSharedMaps(nil)
	if len(shared.Annotations) > 0 {
		t.Errorf("Expected empty shared annotations, got %v", shared.Annotations)
	}
	if shared.Labels.Len() == 0 {
		t.Errorf("Expected non-empty shared labels, got %v", shared.Labels)
	}
}

func TestDedupSharedMapsWithSingleAlert(t *testing.T) {
	ag := models.AlertGroup{
		Alerts: models.AlertList{
			models.Alert{},
		},
	}
	shared, _ := ag.DedupSharedMaps(nil)
	if len(shared.Annotations) > 0 {
		t.Errorf("Expected empty shared annotations, got %v", shared.Annotations)
	}
	if shared.Labels.Len() > 0 {
		t.Errorf("Expected empty shared labels, got %v", shared.Labels)
	}
}

func TestDedupWithBadSource(t *testing.T) {
	ag := models.AlertGroup{
		Alerts: models.AlertList{
			models.Alert{Alertmanager: []models.AlertmanagerInstance{{Source: "%gh&%ij"}}},
			models.Alert{Alertmanager: []models.AlertmanagerInstance{{Source: ""}}},
		},
	}
	shared, _ := ag.DedupSharedMaps(nil)
	if len(shared.Sources) > 0 {
		t.Errorf("Expected empty sources list, got %v", shared.Sources)
	}
}

func TestDedupSharedMapsWithDropNames(t *testing.T) {
	// verifies that passing dropNames to DedupSharedMaps removes those labels
	// from both group labels and alert labels
	ag := models.AlertGroup{
		Receiver: "default",
		Labels:   labels.FromStrings("alertname", "TestAlert", "cluster", "prod"),
		Alerts: models.AlertList{
			models.Alert{
				State:  models.AlertStateActive,
				Labels: labels.FromStrings("alertname", "TestAlert", "cluster", "prod", "instance", "1"),
			},
			models.Alert{
				State:  models.AlertStateActive,
				Labels: labels.FromStrings("alertname", "TestAlert", "cluster", "prod", "instance", "2"),
			},
		},
	}
	ag.DedupSharedMaps([]string{"cluster"})

	// "cluster" should be removed from group labels
	if ag.Labels.Get("cluster") != "" {
		t.Error("Expected 'cluster' label to be removed from group labels")
	}
	// "alertname" should remain in group labels
	if ag.Labels.Get("alertname") == "" {
		t.Error("Expected 'alertname' label to remain in group labels")
	}
	// alert labels should not contain "cluster" (dropped) or "alertname" (shared with group)
	for i, alert := range ag.Alerts {
		if alert.Labels.Get("cluster") != "" {
			t.Errorf("Alert[%d]: expected 'cluster' label to be removed", i)
		}
		if alert.Labels.Get("alertname") != "" {
			t.Errorf("Alert[%d]: expected 'alertname' label to be removed (shared with group)", i)
		}
	}
}

func TestAPIAlertGroupJSONFieldsNonNull(t *testing.T) {
	type testCaseT struct {
		desc string
		ag   models.AlertGroup
	}

	testCases := []testCaseT{
		{
			// verifies that a group with multiple alerts produces non-null alerts and labels
			desc: "multiple alerts",
			ag: models.AlertGroup{
				Receiver: "default",
				Labels:   labels.FromStrings("alertname", "Test"),
				Alerts: models.AlertList{
					{State: models.AlertStateActive, Labels: labels.FromStrings("alertname", "Test", "instance", "1")},
					{State: models.AlertStateActive, Labels: labels.FromStrings("alertname", "Test", "instance", "2")},
				},
			},
		},
		{
			// verifies that a group with a single alert produces non-null alerts and labels
			desc: "single alert",
			ag: models.AlertGroup{
				Receiver: "default",
				Labels:   labels.FromStrings("alertname", "Test"),
				Alerts: models.AlertList{
					{State: models.AlertStateActive, Labels: labels.FromStrings("alertname", "Test")},
				},
			},
		},
		{
			// verifies that a group with empty labels produces non-null labels array
			desc: "empty labels",
			ag: models.AlertGroup{
				Alerts: models.AlertList{
					{State: models.AlertStateActive, Labels: labels.EmptyLabels()},
				},
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.desc, func(t *testing.T) {
			shared, allLabels := tc.ag.DedupSharedMaps(nil)
			apiAG := models.NewAPIAlertGroup(tc.ag, shared, allLabels, len(tc.ag.Alerts))

			b, err := json.Marshal(apiAG)
			if err != nil {
				t.Fatalf("json.Marshal failed: %v", err)
			}

			var raw map[string]json.RawMessage
			if err := json.Unmarshal(b, &raw); err != nil {
				t.Fatalf("json.Unmarshal into raw map failed: %v", err)
			}

			// alerts field must be a non-null JSON array
			alertsRaw, ok := raw["alerts"]
			if !ok {
				t.Fatal("JSON output missing 'alerts' field")
			}
			if string(alertsRaw) == "null" {
				t.Error("JSON 'alerts' field is null, expected a non-null array")
			}

			// labels field must be a non-null JSON array
			labelsRaw, ok := raw["labels"]
			if !ok {
				t.Fatal("JSON output missing 'labels' field")
			}
			if string(labelsRaw) == "null" {
				t.Error("JSON 'labels' field is null, expected a non-null array")
			}

			// shared.labels must also be non-null
			var sharedRaw map[string]json.RawMessage
			if err := json.Unmarshal(raw["shared"], &sharedRaw); err != nil {
				t.Fatalf("json.Unmarshal shared failed: %v", err)
			}
			sharedLabelsRaw, ok := sharedRaw["labels"]
			if !ok {
				t.Fatal("JSON output missing 'shared.labels' field")
			}
			if string(sharedLabelsRaw) == "null" {
				t.Error("JSON 'shared.labels' field is null, expected a non-null array")
			}
		})
	}
}

func TestCompareLabelValueStats(t *testing.T) {
	type testCaseT struct {
		a        models.LabelValueStats
		b        models.LabelValueStats
		expected int
	}

	testCases := []testCaseT{
		// verifies that higher hits sorts before lower hits
		{
			a:        models.LabelValueStats{Value: "a", Hits: 10},
			b:        models.LabelValueStats{Value: "b", Hits: 5},
			expected: -1,
		},
		// verifies that lower hits sorts after higher hits
		{
			a:        models.LabelValueStats{Value: "a", Hits: 5},
			b:        models.LabelValueStats{Value: "b", Hits: 10},
			expected: 1,
		},
		// verifies that equal hits falls back to natural value ordering (a < b)
		{
			a:        models.LabelValueStats{Value: "a", Hits: 5},
			b:        models.LabelValueStats{Value: "b", Hits: 5},
			expected: -1,
		},
		// verifies that equal hits falls back to natural value ordering (b > a)
		{
			a:        models.LabelValueStats{Value: "b", Hits: 5},
			b:        models.LabelValueStats{Value: "a", Hits: 5},
			expected: 1,
		},
		// verifies that identical hits and values returns 0
		{
			a:        models.LabelValueStats{Value: "a", Hits: 5},
			b:        models.LabelValueStats{Value: "a", Hits: 5},
			expected: 0,
		},
	}

	for _, tc := range testCases {
		result := models.CompareLabelValueStats(tc.a, tc.b)
		if result != tc.expected {
			t.Errorf("CompareLabelValueStats(%v, %v) returned %d, expected %d", tc.a, tc.b, result, tc.expected)
		}
	}
}

func TestNameStatsSort(t *testing.T) {
	nameStats := models.LabelNameStatsList{
		{
			Name: "@state",
			Hits: 24,
			Values: models.LabelValueStatsList{
				models.LabelValueStats{
					Value:   "suppressed",
					Raw:     "@state=suppressed",
					Hits:    8,
					Percent: 33,
					Offset:  67,
				},
				models.LabelValueStats{
					Value:   "active",
					Raw:     "@state=actuve",
					Hits:    16,
					Percent: 67,
					Offset:  0,
				},
			},
		},
		{
			Name: "cluster",
			Hits: 24,
			Values: models.LabelValueStatsList{
				models.LabelValueStats{
					Value:   "dev",
					Raw:     "cluster=dev",
					Hits:    10,
					Percent: 42,
					Offset:  0,
				},
				models.LabelValueStats{
					Value:   "prod",
					Raw:     "cluster=prod",
					Hits:    6,
					Percent: 25,
					Offset:  42,
				},
				models.LabelValueStats{
					Value:   "staging",
					Raw:     "cluster=staging",
					Hits:    8,
					Percent: 33,
					Offset:  67,
				},
			},
		},
		{
			Name: "alertname",
			Hits: 24,
			Values: models.LabelValueStatsList{
				models.LabelValueStats{
					Value:   "HTTP_Probe_Failed",
					Raw:     "alertname=HTTP_Probe_Failed",
					Hits:    4,
					Percent: 17,
					Offset:  0,
				},
				models.LabelValueStats{
					Value:   "Host_Down",
					Raw:     "alertname=Host_Down",
					Hits:    16,
					Percent: 67,
					Offset:  17,
				},
				models.LabelValueStats{
					Value: "Free_Disk_Space_Too_Low",
					Raw:   "alertname=Free_Disk_Space_Too_Low",

					Hits:    2,
					Percent: 8,
					Offset:  84,
				},
				models.LabelValueStats{
					Value:   "Memory_Usage_Too_High",
					Raw:     "alertname=Memory_Usage_Too_High",
					Hits:    2,
					Percent: 8,
					Offset:  92,
				},
			},
		},
		{
			Name: "instance",
			Hits: 24,
			Values: models.LabelValueStatsList{
				models.LabelValueStats{
					Value:   "server4",
					Raw:     "instance=server4",
					Hits:    2,
					Percent: 8,
				},
				models.LabelValueStats{
					Value:   "server5",
					Raw:     "instance=server5",
					Hits:    4,
					Percent: 17,
					Offset:  17,
				},
				models.LabelValueStats{
					Value:   "server6",
					Raw:     "instance=server6",
					Hits:    2,
					Percent: 8,
					Offset:  17,
				},
				models.LabelValueStats{
					Value:   "server1",
					Raw:     "instance=server1",
					Hits:    2,
					Percent: 8,
					Offset:  17,
				},
				models.LabelValueStats{
					Value:   "server2",
					Raw:     "instance=server2",
					Hits:    4,
					Percent: 17,
					Offset:  17,
				},
				models.LabelValueStats{
					Value:   "server3",
					Raw:     "instance=server3",
					Hits:    2,
					Percent: 8,
					Offset:  17,
				},
				models.LabelValueStats{
					Value:   "server7",
					Raw:     "instance=server7",
					Hits:    2,
					Percent: 8,
					Offset:  17,
				},
				models.LabelValueStats{
					Value:   "server8",
					Raw:     "instance=server8",
					Hits:    2,
					Percent: 8,
					Offset:  17,
				},
				models.LabelValueStats{
					Value:   "web1",
					Raw:     "instance=web1",
					Hits:    2,
					Percent: 8,
					Offset:  17,
				},
				models.LabelValueStats{
					Value:   "web2",
					Raw:     "instance=web2",
					Hits:    2,
					Percent: 8,
					Offset:  17,
				},
			},
		},
		{
			Name: "@receiver",
			Hits: 24,
			Values: models.LabelValueStatsList{
				models.LabelValueStats{
					Value:   "by-name",
					Raw:     "@receiver=by-name",
					Hits:    12,
					Percent: 50,
					Offset:  0,
				},
				models.LabelValueStats{
					Value:   "by-cluster-service",
					Raw:     "@receiver=by-cluster-service",
					Hits:    12,
					Percent: 50,
					Offset:  50,
				},
			},
		},
		{
			Name: "job",
			Hits: 16,
			Values: models.LabelValueStatsList{
				models.LabelValueStats{
					Value:   "node_exporter",
					Raw:     "job=node_exporter",
					Hits:    8,
					Percent: 50,
					Offset:  0,
				},
				models.LabelValueStats{
					Value:   "node_ping",
					Raw:     "job=node_ping",
					Hits:    8,
					Percent: 50,
					Offset:  50,
				},
			},
		},
	}

	b, err := json.Marshal(nameStats)
	if err != nil {
		t.Error(err)
	}
	before := string(b)

	for _, n := range nameStats {
		slices.SortFunc(n.Values, models.CompareLabelValueStats)
	}
	slices.SortFunc(nameStats, models.CompareLabelNameStats)

	a, err := json.Marshal(nameStats)
	if err != nil {
		t.Error(err)
	}
	after := string(a)

	if after == before {
		t.Errorf("Sorting LabelNameStatsList produces the same output as unsorted instance")
	}
}
