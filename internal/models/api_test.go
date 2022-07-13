package models_test

import (
	"bytes"
	"encoding/json"
	"sort"
	"testing"

	"github.com/beme/abide"

	"github.com/prymitive/karma/internal/models"
)

func TestDedupSharedMaps(t *testing.T) {
	ag := models.APIAlertGroup{
		AlertGroup: models.AlertGroup{
			Labels: models.Labels{
				{Name: "alertname", Value: "FakeAlert"},
			},
			Alerts: models.AlertList{
				models.Alert{
					State: models.AlertStateSuppressed,
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
					Labels: models.Labels{
						{Name: "alertname", Value: "FakeAlert"},
						{Name: "job", Value: "node_exporter"},
						{Name: "instance", Value: "1"},
					},
					Alertmanager: []models.AlertmanagerInstance{
						{
							Fingerprint: "1",
							Name:        "am1",
							Cluster:     "fakeCluster",
							SilencedBy:  []string{"fakeSilence1", "fakeSilence2"},
							Source:      "https://prom.example.com/graph?foo",
						},
						{
							Fingerprint: "2",
							Name:        "am2",
							Cluster:     "fakeCluster",
							SilencedBy:  []string{"fakeSilence1", "fakeSilence2"},
							Source:      "https://prom.example.com/subdir/graph?bar",
						},
					},
				},
				models.Alert{
					State: models.AlertStateActive,
					Annotations: models.Annotations{
						models.Annotation{
							Name:  "summary",
							Value: "this is summary",
						},
					},
					Labels: models.Labels{
						{Name: "alertname", Value: "FakeAlert"},
						{Name: "job", Value: "node_exporter"},
						{Name: "instance", Value: "2"},
					},
					Alertmanager: []models.AlertmanagerInstance{
						{
							Fingerprint: "1",
							Name:        "am1",
							Cluster:     "fakeCluster",
							SilencedBy:  []string{"fakeSilence1", "fakeSilence2"},
							Source:      "https://am.example.com",
						},
						{
							Fingerprint: "1",
							Name:        "am2",
							Cluster:     "fakeCluster",
							SilencedBy:  []string{"fakeSilence1", "fakeSilence2"},
							Source:      "https://am.example.com",
						},
					},
				},
				models.Alert{
					State: models.AlertStateSuppressed,
					Annotations: models.Annotations{
						models.Annotation{
							Name:  "summary",
							Value: "this is summary",
						},
					},
					Labels: models.Labels{
						{Name: "alertname", Value: "FakeAlert"},
						{Name: "job", Value: "blackbox"},
						{Name: "instance", Value: "3"},
						{Name: "extra", Value: "ignore"},
					},
					Alertmanager: []models.AlertmanagerInstance{
						{
							Fingerprint: "1",
							Name:        "am1",
							Cluster:     "fakeCluster",
							SilencedBy:  []string{"fakeSilence1", "fakeSilence2"},
							Source:      "https://am.example.com/graph",
						},
						{
							Fingerprint: "1",
							Name:        "am2",
							Cluster:     "fakeCluster",
							SilencedBy:  []string{"fakeSilence1", "fakeSilence2"},
							Source:      "https://am.example.com/graph",
						},
					},
				},
			},
		},
	}
	ag.DedupSharedMaps(nil)

	agJSON, _ := json.MarshalIndent(ag, "", "  ")
	abide.AssertReader(t, "SharedMaps", bytes.NewReader(agJSON))
}

func TestDedupSharedMapsSingleGroup(t *testing.T) {
	ag := models.APIAlertGroup{
		AlertGroup: models.AlertGroup{
			Alerts: models.AlertList{
				models.Alert{
					State: models.AlertStateActive,
					Labels: models.Labels{
						{Name: "foo", Value: "bar"},
					},
				},
				models.Alert{
					State: models.AlertStateUnprocessed,
					Labels: models.Labels{
						{Name: "foo", Value: "bar"},
					},
				},
			},
		},
	}
	ag.DedupSharedMaps(nil)
	if len(ag.Shared.Annotations) > 0 {
		t.Errorf("Expected empty shared annotations, got %v", ag.Shared.Annotations)
	}
	if len(ag.Shared.Labels) == 0 {
		t.Errorf("Expected non-empty shared labels, got %v", ag.Shared.Labels)
	}
}

func TestDedupSharedMapsWithSingleAlert(t *testing.T) {
	ag := models.APIAlertGroup{
		AlertGroup: models.AlertGroup{
			Alerts: models.AlertList{
				models.Alert{},
			},
		},
	}
	ag.DedupSharedMaps(nil)
	if len(ag.Shared.Annotations) > 0 {
		t.Errorf("Expected empty shared annotations, got %v", ag.Shared.Annotations)
	}
	if len(ag.Shared.Labels) > 0 {
		t.Errorf("Expected empty shared labels, got %v", ag.Shared.Labels)
	}
}

func TestDedupWithBadSource(t *testing.T) {
	ag := models.APIAlertGroup{
		AlertGroup: models.AlertGroup{
			Alerts: models.AlertList{
				models.Alert{Alertmanager: []models.AlertmanagerInstance{{Source: "%gh&%ij"}}},
				models.Alert{Alertmanager: []models.AlertmanagerInstance{{Source: ""}}},
			},
		},
	}
	ag.DedupSharedMaps(nil)
	if len(ag.Shared.Sources) > 0 {
		t.Errorf("Expected empty sources list, got %v", ag.Shared.Sources)
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
		sort.Sort(n.Values)
	}
	sort.Sort(nameStats)

	a, err := json.Marshal(nameStats)
	if err != nil {
		t.Error(err)
	}
	after := string(a)

	if after == before {
		t.Errorf("Sorting LabelNameStatsList produces the same output as unsorted instance")
	}
}
