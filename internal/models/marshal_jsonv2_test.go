package models_test

import (
	"encoding/json"
	"reflect"
	"testing"
	"time"

	jsonv2 "github.com/go-json-experiment/json"

	"github.com/prymitive/karma/internal/models"
)

// TestMarshalJSONTo_MatchesV1 verifies that our custom MarshalJSONTo methods
// produce JSON that is semantically identical to encoding/json v1's
// reflection-based Marshal for the same struct values.
func TestMarshalJSONTo_MatchesV1(t *testing.T) {
	ts := time.Date(2025, 3, 10, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		// scenario describes the behaviour being tested
		name string
		val  any
	}{
		{
			// empty ordered labels slice should marshal to []
			name: "OrderedLabels/empty",
			val:  models.OrderedLabels{},
		},
		{
			// ordered labels with multiple entries
			name: "OrderedLabels/populated",
			val: models.OrderedLabels{
				{Name: "alertname", Value: "TestAlert"},
				{Name: "severity", Value: "critical"},
			},
		},
		{
			// single annotation with all boolean fields set
			name: "Annotation/allFields",
			val: models.Annotation{
				Name:     "summary",
				Value:    "Something broke",
				Visible:  true,
				IsLink:   false,
				IsAction: true,
			},
		},
		{
			// empty annotations slice should marshal to []
			name: "Annotations/empty",
			val:  models.Annotations{},
		},
		{
			// annotations with mixed visibility and link flags
			name: "Annotations/populated",
			val: models.Annotations{
				{Name: "summary", Value: "test", Visible: true, IsLink: false, IsAction: false},
				{Name: "url", Value: "https://example.com", Visible: false, IsLink: true, IsAction: false},
			},
		},
		{
			// alert with all nested types populated
			name: "APIAlert/full",
			val: models.APIAlert{
				StartsAt: ts,
				State:    "active",
				Receiver: "default",
				LabelsFP: "abc123",
				Annotations: models.Annotations{
					{Name: "summary", Value: "test alert", Visible: true},
				},
				Labels: models.OrderedLabels{
					{Name: "alertname", Value: "TestAlert"},
				},
				Alertmanager: []models.AlertmanagerInstance{
					{
						StartsAt:    ts,
						Fingerprint: "fp1",
						Name:        "am1",
						Cluster:     "cluster1",
						Source:      "http://am1:9093",
						SilencedBy:  []string{"silence1"},
						InhibitedBy: []string{},
						State:       models.AlertStateActive,
					},
				},
			},
		},
		{
			// alert with empty slices to verify they marshal as [] not null
			name: "APIAlert/emptySlices",
			val: models.APIAlert{
				StartsAt:     ts,
				State:        "suppressed",
				Annotations:  models.Annotations{},
				Labels:       models.OrderedLabels{},
				Alertmanager: []models.AlertmanagerInstance{},
			},
		},
		{
			// alertmanager instance with all fields populated
			name: "AlertmanagerInstance/full",
			val: models.AlertmanagerInstance{
				StartsAt:    ts,
				Fingerprint: "fp-abc",
				Name:        "prod-am",
				Cluster:     "us-east",
				Source:      "http://prod-am:9093/#/alerts",
				SilencedBy:  []string{"s1", "s2"},
				InhibitedBy: []string{"i1"},
				State:       models.AlertStateSuppressed,
			},
		},
		{
			// shared maps with all nested types
			name: "APIAlertGroupSharedMaps/full",
			val: models.APIAlertGroupSharedMaps{
				Annotations: models.Annotations{
					{Name: "shared_ann", Value: "shared_val", Visible: true},
				},
				Labels: models.OrderedLabels{
					{Name: "job", Value: "node_exporter"},
				},
				Silences: map[string][]string{
					"am1": {"silence-a"},
				},
				Sources:  []string{"http://am1:9093"},
				Clusters: []string{"cluster1"},
			},
		},
		{
			// shared maps with empty collections
			name: "APIAlertGroupSharedMaps/empty",
			val: models.APIAlertGroupSharedMaps{
				Annotations: models.Annotations{},
				Labels:      models.OrderedLabels{},
				Silences:    map[string][]string{},
				Sources:     []string{},
				Clusters:    []string{},
			},
		},
		{
			// filter with all fields populated
			name: "Filter/full",
			val: models.Filter{
				Text:    "@alertname=~test",
				Name:    "alertname",
				Matcher: "=~",
				Value:   "test",
				Hits:    42,
				IsValid: true,
			},
		},
		{
			// label colors with background and brightness
			name: "LabelColors/full",
			val: models.LabelColors{
				Background: "rgba(255,0,0,255)",
				Brightness: 128,
			},
		},
		{
			// nested color map with multiple labels and values
			name: "LabelsColorMap/populated",
			val: models.LabelsColorMap{
				"severity": {
					"critical": models.LabelColors{Background: "#f00", Brightness: 100},
				},
			},
		},
		{
			// label value stats with all fields
			name: "LabelValueStats/full",
			val: models.LabelValueStats{
				Value:   "critical",
				Raw:     "critical",
				Hits:    10,
				Percent: 50,
				Offset:  0,
			},
		},
		{
			// label value stats list with multiple entries
			name: "LabelValueStatsList/populated",
			val: models.LabelValueStatsList{
				{Value: "critical", Raw: "critical", Hits: 10, Percent: 50, Offset: 0},
				{Value: "warning", Raw: "warning", Hits: 5, Percent: 25, Offset: 50},
			},
		},
		{
			// label name stats with nested values
			name: "LabelNameStats/full",
			val: models.LabelNameStats{
				Name: "severity",
				Values: models.LabelValueStatsList{
					{Value: "critical", Raw: "critical", Hits: 10, Percent: 50, Offset: 0},
				},
				Hits: 10,
			},
		},
		{
			// label name stats list with multiple entries
			name: "LabelNameStatsList/populated",
			val: models.LabelNameStatsList{
				{Name: "severity", Values: models.LabelValueStatsList{{Value: "critical", Raw: "critical", Hits: 10, Percent: 100, Offset: 0}}, Hits: 10},
			},
		},
		{
			// silence matcher with regex enabled
			name: "SilenceMatcher/regex",
			val: models.SilenceMatcher{
				Name:    "alertname",
				Value:   "test.*",
				IsRegex: true,
				IsEqual: true,
			},
		},
		{
			// silence with all fields and multiple matchers
			name: "Silence/full",
			val: models.Silence{
				StartsAt:  ts,
				EndsAt:    ts.Add(time.Hour),
				CreatedAt: ts.Add(-time.Hour),
				ID:        "silence-123",
				CreatedBy: "user@example.com",
				Comment:   "maintenance window",
				TicketID:  "JIRA-456",
				TicketURL: "https://jira.example.com/JIRA-456",
				Matchers: []models.SilenceMatcher{
					{Name: "alertname", Value: "TestAlert", IsRegex: false, IsEqual: true},
				},
			},
		},
		{
			// managed silence wrapping a silence with metadata
			name: "ManagedSilence/full",
			val: models.ManagedSilence{
				Cluster: "prod",
				Silence: models.Silence{
					StartsAt:  ts,
					EndsAt:    ts.Add(time.Hour),
					CreatedAt: ts,
					ID:        "sil-1",
					CreatedBy: "admin",
					Comment:   "test",
					Matchers:  []models.SilenceMatcher{{Name: "env", Value: "prod", IsEqual: true}},
				},
				AlertCount: 5,
				IsExpired:  false,
			},
		},
		{
			// alertmanager API status with all fields
			name: "AlertmanagerAPIStatus/full",
			val: models.AlertmanagerAPIStatus{
				Headers:         map[string]string{"X-Custom": "value"},
				Name:            "am1",
				URI:             "http://am1:9093",
				PublicURI:       "https://am1.example.com",
				CORSCredentials: "include",
				Error:           "",
				Version:         "0.27.0",
				Cluster:         "prod",
				ClusterMembers:  []string{"am1", "am2"},
				ReadOnly:        false,
			},
		},
		{
			// alertmanager API counters
			name: "AlertmanagerAPICounters/full",
			val: models.AlertmanagerAPICounters{
				Total:   3,
				Healthy: 2,
				Failed:  1,
			},
		},
		{
			// alertmanager API summary with nested instances and counters
			name: "AlertmanagerAPISummary/full",
			val: models.AlertmanagerAPISummary{
				Clusters: map[string][]string{"prod": {"am1", "am2"}},
				Instances: []models.AlertmanagerAPIStatus{
					{
						Headers:         map[string]string{},
						Name:            "am1",
						URI:             "http://am1:9093",
						Cluster:         "prod",
						ClusterMembers:  []string{},
						PublicURI:       "",
						CORSCredentials: "",
						Error:           "",
						Version:         "",
					},
				},
				Counters: models.AlertmanagerAPICounters{Total: 1, Healthy: 1},
			},
		},
		{
			// grid settings
			name: "GridSettings/full",
			val: models.GridSettings{
				Order:   "startsAt",
				Label:   "severity",
				Reverse: true,
			},
		},
		{
			// sort settings with nested grid and value mapping
			name: "SortSettings/full",
			val: models.SortSettings{
				ValueMapping: map[string]map[string]string{
					"severity": {"critical": "1", "warning": "2"},
				},
				Grid: models.GridSettings{Order: "label", Label: "cluster", Reverse: false},
			},
		},
		{
			// silence form strip settings
			name: "SilenceFormStripSettings/full",
			val: models.SilenceFormStripSettings{
				Labels: []string{"alertname", "severity"},
			},
		},
		{
			// silence form settings with nested strip
			name: "SilenceFormSettings/full",
			val: models.SilenceFormSettings{
				Strip:                models.SilenceFormStripSettings{Labels: []string{"job"}},
				DefaultAlertmanagers: []string{"am1"},
			},
		},
		{
			// alert acknowledgement settings
			name: "AlertAcknowledgementSettings/full",
			val: models.AlertAcknowledgementSettings{
				Author:          "karma",
				Comment:         "ACK!",
				DurationSeconds: 900,
				Enabled:         true,
			},
		},
		{
			// labels settings map with multiple entries
			name: "LabelsSettings/populated",
			val: models.LabelsSettings{
				"alertname": {IsStatic: true, IsValueOnly: false},
				"job":       {IsStatic: false, IsValueOnly: true},
			},
		},
		{
			// full settings with all nested structures
			name: "Settings/full",
			val: models.Settings{
				Labels: models.LabelsSettings{
					"alertname": {IsStatic: true},
				},
				Sorting: models.SortSettings{
					ValueMapping: map[string]map[string]string{},
					Grid:         models.GridSettings{Order: "label"},
				},
				SilenceForm: models.SilenceFormSettings{
					Strip:                models.SilenceFormStripSettings{Labels: []string{}},
					DefaultAlertmanagers: []string{},
				},
				AnnotationsHidden:  []string{"help"},
				AnnotationsVisible: []string{"summary"},
				AlertAcknowledgement: models.AlertAcknowledgementSettings{
					Enabled: true, DurationSeconds: 900, Author: "karma", Comment: "ACK",
				},
				GridGroupLimit:           40,
				AnnotationsDefaultHidden: false,
				AnnotationsAllowHTML:     true,
				HistoryEnabled:           true,
			},
		},
		{
			// authentication info
			name: "AuthenticationInfo/full",
			val: models.AuthenticationInfo{
				Username: "admin",
				Groups:   []string{"ops", "dev"},
				Enabled:  true,
			},
		},
		{
			// autocomplete entry
			name: "Autocomplete/full",
			val: models.Autocomplete{
				Value:  "@alertname=TestAlert",
				Tokens: []string{"alertname", "alertname=", "TestAlert"},
			},
		},
		{
			// counters with nested label name stats
			name: "Counters/full",
			val: models.Counters{
				Counters: models.LabelNameStatsList{
					{Name: "severity", Values: models.LabelValueStatsList{{Value: "critical", Raw: "critical", Hits: 5, Percent: 100, Offset: 0}}, Hits: 5},
				},
				Total: 5,
			},
		},
		{
			// API grid with state counts, label info, and nested alert groups
			name: "APIGrid/full",
			val: models.APIGrid{
				StateCount: map[string]int{"active": 2, "suppressed": 1},
				LabelName:  "cluster",
				LabelValue: "prod",
				AlertGroups: []models.APIAlertGroup{
					{
						AllLabels:         map[string]map[string][]string{},
						AlertmanagerCount: map[string]int{"am1": 1},
						StateCount:        map[string]int{"active": 1},
						Receiver:          "default",
						ID:                "group-1",
						Shared: models.APIAlertGroupSharedMaps{
							Annotations: models.Annotations{},
							Labels:      models.OrderedLabels{},
							Silences:    map[string][]string{},
							Sources:     []string{},
							Clusters:    []string{},
						},
						Labels: models.OrderedLabels{},
						Alerts: []models.APIAlert{},
					},
				},
				TotalGroups: 1,
			},
		},
		{
			// full alert group with all nested structures populated
			name: "APIAlertGroup/full",
			val: models.APIAlertGroup{
				AllLabels: map[string]map[string][]string{
					"active": {
						"alertname": {"TestAlert"},
						"severity":  {"critical", "warning"},
					},
				},
				AlertmanagerCount: map[string]int{"am1": 2},
				StateCount:        map[string]int{"active": 1, "suppressed": 1},
				Receiver:          "default",
				ID:                "group-1",
				Shared: models.APIAlertGroupSharedMaps{
					Annotations: models.Annotations{},
					Labels:      models.OrderedLabels{{Name: "job", Value: "test"}},
					Silences:    map[string][]string{},
					Sources:     []string{"http://am1:9093"},
					Clusters:    []string{"cluster1"},
				},
				Labels: models.OrderedLabels{
					{Name: "alertname", Value: "TestAlert"},
				},
				Alerts: []models.APIAlert{
					{
						StartsAt: ts,
						State:    "active",
						Receiver: "default",
						LabelsFP: "fp1",
						Annotations: models.Annotations{
							{Name: "summary", Value: "test", Visible: true},
						},
						Labels: models.OrderedLabels{
							{Name: "instance", Value: "localhost:9090"},
						},
						Alertmanager: []models.AlertmanagerInstance{
							{
								StartsAt:    ts,
								Fingerprint: "fp1",
								Name:        "am1",
								Cluster:     "cluster1",
								Source:      "http://am1:9093",
								SilencedBy:  []string{},
								InhibitedBy: []string{},
								State:       models.AlertStateActive,
							},
						},
					},
				},
				TotalAlerts: 5,
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// v1 encoding/json is the reference output
			v1Bytes, err := json.Marshal(tc.val)
			if err != nil {
				t.Fatalf("v1 Marshal failed: %v", err)
			}

			// v2 will dispatch to our MarshalJSONTo methods
			v2Bytes, err := jsonv2.Marshal(tc.val)
			if err != nil {
				t.Fatalf("v2 Marshal failed: %v", err)
			}

			// unmarshal both into any for comparison, this handles
			// non-deterministic map key ordering
			var v1Any, v2Any any
			if err := json.Unmarshal(v1Bytes, &v1Any); err != nil {
				t.Fatalf("v1 Unmarshal failed: %v", err)
			}
			if err := json.Unmarshal(v2Bytes, &v2Any); err != nil {
				t.Fatalf("v2 Unmarshal failed: %v", err)
			}

			if !reflect.DeepEqual(v1Any, v2Any) {
				t.Errorf("v1 vs v2 mismatch\nv1: %s\nv2: %s", v1Bytes, v2Bytes)
			}
		})
	}
}
