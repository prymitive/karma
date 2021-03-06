package models_test

import (
	"encoding/json"
	"sort"
	"testing"

	"github.com/pmezard/go-difflib/difflib"

	"github.com/prymitive/karma/internal/models"
)

func TestDedupSharedMaps(t *testing.T) {
	am := models.AlertmanagerInstance{
		Fingerprint: "1",
		Name:        "am",
		Cluster:     "fakeCluster",
		SilencedBy:  []string{"fakeSilence1", "fakeSilence2"},
	}
	ag := models.APIAlertGroup{
		AlertGroup: models.AlertGroup{
			Labels: map[string]string{
				"alertname": "FakeAlert",
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
					Labels: map[string]string{
						"alertname": "FakeAlert",
						"job":       "node_exporter",
						"instance":  "1",
					},
					Alertmanager: []models.AlertmanagerInstance{am, am},
				},
				models.Alert{
					State: models.AlertStateSuppressed,
					Annotations: models.Annotations{
						models.Annotation{
							Name:  "summary",
							Value: "this is summary",
						},
					},
					Labels: map[string]string{
						"alertname": "FakeAlert",
						"job":       "node_exporter",
						"instance":  "2",
					},
					Alertmanager: []models.AlertmanagerInstance{am, am},
				},
				models.Alert{
					State: models.AlertStateSuppressed,
					Annotations: models.Annotations{
						models.Annotation{
							Name:  "summary",
							Value: "this is summary",
						},
					},
					Labels: map[string]string{
						"alertname": "FakeAlert",
						"job":       "blackbox",
						"instance":  "3",
					},
					Alertmanager: []models.AlertmanagerInstance{am, am},
				},
			},
		},
	}
	ag.DedupSharedMaps()

	expectedJSON := `{
  "receiver": "",
  "labels": {
    "alertname": "FakeAlert"
  },
  "alerts": [
    {
      "annotations": [
        {
          "name": "foo",
          "value": "bar",
          "visible": false,
          "isLink": false,
          "isAction": false
        }
      ],
      "labels": {
        "instance": "1",
        "job": "node_exporter"
      },
      "startsAt": "0001-01-01T00:00:00Z",
      "state": "suppressed",
      "alertmanager": [
        {
          "fingerprint": "1",
          "name": "am",
          "cluster": "fakeCluster",
          "state": "",
          "startsAt": "0001-01-01T00:00:00Z",
          "source": "",
          "silencedBy": [
            "fakeSilence1",
            "fakeSilence2"
          ],
          "inhibitedBy": null
        },
        {
          "fingerprint": "1",
          "name": "am",
          "cluster": "fakeCluster",
          "state": "",
          "startsAt": "0001-01-01T00:00:00Z",
          "source": "",
          "silencedBy": [
            "fakeSilence1",
            "fakeSilence2"
          ],
          "inhibitedBy": null
        }
      ],
      "receiver": "",
      "id": ""
    },
    {
      "annotations": [],
      "labels": {
        "instance": "2",
        "job": "node_exporter"
      },
      "startsAt": "0001-01-01T00:00:00Z",
      "state": "suppressed",
      "alertmanager": [
        {
          "fingerprint": "1",
          "name": "am",
          "cluster": "fakeCluster",
          "state": "",
          "startsAt": "0001-01-01T00:00:00Z",
          "source": "",
          "silencedBy": [
            "fakeSilence1",
            "fakeSilence2"
          ],
          "inhibitedBy": null
        },
        {
          "fingerprint": "1",
          "name": "am",
          "cluster": "fakeCluster",
          "state": "",
          "startsAt": "0001-01-01T00:00:00Z",
          "source": "",
          "silencedBy": [
            "fakeSilence1",
            "fakeSilence2"
          ],
          "inhibitedBy": null
        }
      ],
      "receiver": "",
      "id": ""
    },
    {
      "annotations": [],
      "labels": {
        "instance": "3",
        "job": "blackbox"
      },
      "startsAt": "0001-01-01T00:00:00Z",
      "state": "suppressed",
      "alertmanager": [
        {
          "fingerprint": "1",
          "name": "am",
          "cluster": "fakeCluster",
          "state": "",
          "startsAt": "0001-01-01T00:00:00Z",
          "source": "",
          "silencedBy": [
            "fakeSilence1",
            "fakeSilence2"
          ],
          "inhibitedBy": null
        },
        {
          "fingerprint": "1",
          "name": "am",
          "cluster": "fakeCluster",
          "state": "",
          "startsAt": "0001-01-01T00:00:00Z",
          "source": "",
          "silencedBy": [
            "fakeSilence1",
            "fakeSilence2"
          ],
          "inhibitedBy": null
        }
      ],
      "receiver": "",
      "id": ""
    }
  ],
  "id": "",
  "alertmanagerCount": null,
  "stateCount": null,
  "shared": {
    "annotations": [
      {
        "name": "summary",
        "value": "this is summary",
        "visible": false,
        "isLink": false,
        "isAction": false
      }
    ],
    "labels": {},
    "silences": {
      "fakeCluster": [
        "fakeSilence1",
        "fakeSilence2"
      ]
    }
  }
}`

	agJSON, _ := json.MarshalIndent(ag, "", "  ")
	if string(agJSON) != expectedJSON {
		diff := difflib.UnifiedDiff{
			A:        difflib.SplitLines(expectedJSON),
			B:        difflib.SplitLines(string(agJSON)),
			FromFile: "Expected",
			ToFile:   "Current",
			Context:  3,
		}
		text, err := difflib.GetUnifiedDiffString(diff)
		if err != nil {
			t.Error(err)
		}
		t.Errorf("JSON mismatch:\n%s", text)
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
	ag.DedupSharedMaps()
}

func TestNameStatsSort(t *testing.T) {
	var nameStats = models.LabelNameStatsList{
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
