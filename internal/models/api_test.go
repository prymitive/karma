package models_test

import (
	"encoding/json"
	"testing"

	"github.com/prymitive/unsee/internal/models"
)

func TestDedupSharedMaps(t *testing.T) {
	ag := models.APIAlertGroup{
		AlertGroup: models.AlertGroup{
			Labels: map[string]string{
				"alertname": "FakeAlert",
			},
			Alerts: models.AlertList{
				models.Alert{
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
				},
				models.Alert{
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
				},
				models.Alert{
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
      "state": "",
      "alertmanager": null,
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
      "state": "",
      "alertmanager": null,
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
      "state": "",
      "alertmanager": null,
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
    "labels": {}
  }
}`

	agJSON, _ := json.MarshalIndent(ag, "", "  ")
	if string(agJSON) != expectedJSON {
		t.Errorf("Expected: %s\nGot: %s\n", expectedJSON, string(agJSON))
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
