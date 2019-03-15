package models_test

import (
	"encoding/json"
	"testing"

	"github.com/pmezard/go-difflib/difflib"

	"github.com/prymitive/karma/internal/models"
)

func TestDedupSharedMaps(t *testing.T) {
	am := models.AlertmanagerInstance{
		Cluster:    "fakeCluster",
		SilencedBy: []string{"fakeSilence1", "fakeSilence2"},
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
          "isLink": false
        }
      ],
      "labels": {
        "instance": "1",
        "job": "node_exporter"
      },
      "startsAt": "0001-01-01T00:00:00Z",
      "endsAt": "0001-01-01T00:00:00Z",
      "state": "suppressed",
      "alertmanager": [
        {
          "name": "",
          "cluster": "fakeCluster",
          "state": "",
          "startsAt": "0001-01-01T00:00:00Z",
          "endsAt": "0001-01-01T00:00:00Z",
          "source": "",
          "silencedBy": [
            "fakeSilence1",
            "fakeSilence2"
          ],
          "inhibitedBy": null
        },
        {
          "name": "",
          "cluster": "fakeCluster",
          "state": "",
          "startsAt": "0001-01-01T00:00:00Z",
          "endsAt": "0001-01-01T00:00:00Z",
          "source": "",
          "silencedBy": [
            "fakeSilence1",
            "fakeSilence2"
          ],
          "inhibitedBy": null
        }
      ],
      "receiver": ""
    },
    {
      "annotations": [],
      "labels": {
        "instance": "2",
        "job": "node_exporter"
      },
      "startsAt": "0001-01-01T00:00:00Z",
      "endsAt": "0001-01-01T00:00:00Z",
      "state": "suppressed",
      "alertmanager": [
        {
          "name": "",
          "cluster": "fakeCluster",
          "state": "",
          "startsAt": "0001-01-01T00:00:00Z",
          "endsAt": "0001-01-01T00:00:00Z",
          "source": "",
          "silencedBy": [
            "fakeSilence1",
            "fakeSilence2"
          ],
          "inhibitedBy": null
        },
        {
          "name": "",
          "cluster": "fakeCluster",
          "state": "",
          "startsAt": "0001-01-01T00:00:00Z",
          "endsAt": "0001-01-01T00:00:00Z",
          "source": "",
          "silencedBy": [
            "fakeSilence1",
            "fakeSilence2"
          ],
          "inhibitedBy": null
        }
      ],
      "receiver": ""
    },
    {
      "annotations": [],
      "labels": {
        "instance": "3",
        "job": "blackbox"
      },
      "startsAt": "0001-01-01T00:00:00Z",
      "endsAt": "0001-01-01T00:00:00Z",
      "state": "suppressed",
      "alertmanager": [
        {
          "name": "",
          "cluster": "fakeCluster",
          "state": "",
          "startsAt": "0001-01-01T00:00:00Z",
          "endsAt": "0001-01-01T00:00:00Z",
          "source": "",
          "silencedBy": [
            "fakeSilence1",
            "fakeSilence2"
          ],
          "inhibitedBy": null
        },
        {
          "name": "",
          "cluster": "fakeCluster",
          "state": "",
          "startsAt": "0001-01-01T00:00:00Z",
          "endsAt": "0001-01-01T00:00:00Z",
          "source": "",
          "silencedBy": [
            "fakeSilence1",
            "fakeSilence2"
          ],
          "inhibitedBy": null
        }
      ],
      "receiver": ""
    }
  ],
  "id": "",
  "hash": "",
  "alertmanagerCount": null,
  "stateCount": null,
  "shared": {
    "annotations": [
      {
        "name": "summary",
        "value": "this is summary",
        "visible": false,
        "isLink": false
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
