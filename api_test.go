package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	"github.com/blang/semver"
	"github.com/prymitive/karma/internal/mock"
	"github.com/prymitive/karma/internal/models"
)

type groupTest struct {
	labels     map[string]string
	receiver   string
	alerts     []models.Alert
	hash       string
	id         string
	shared     models.APIAlertGroupSharedMaps
	stateCount map[string]int
}

var groupTests = []groupTest{
	groupTest{
		receiver: "by-name",
		labels: map[string]string{
			"alertname": "Memory_Usage_Too_High",
		},
		alerts: []models.Alert{
			models.Alert{
				Annotations: models.Annotations{
					models.Annotation{Visible: true, Name: "alert", Value: "Memory usage exceeding threshold"},
					models.Annotation{Visible: true, Name: "dashboard", Value: "http://localhost/dashboard.html", IsLink: true},
				},
				Labels: map[string]string{
					"cluster":  "prod",
					"instance": "server2",
					"job":      "node_exporter",
				},
				State: models.AlertStateActive,
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Receiver: "by-name",
			},
		},
		id:   "099c5ca6d1c92f615b13056b935d0c8dee70f18c",
		hash: "e20fa82867c7f7929c7302893c303295ec2576ef",
		stateCount: map[string]int{
			models.AlertStateActive:      1,
			models.AlertStateSuppressed:  0,
			models.AlertStateUnprocessed: 0,
		},
	},
	groupTest{
		receiver: "by-cluster-service",
		labels: map[string]string{
			"alertname": "Memory_Usage_Too_High",
			"cluster":   "prod",
		},
		alerts: []models.Alert{
			models.Alert{
				Annotations: models.Annotations{
					models.Annotation{Visible: true, Name: "alert", Value: "Memory usage exceeding threshold"},
					models.Annotation{Visible: true, Name: "dashboard", Value: "http://localhost/dashboard.html", IsLink: true},
				},
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Labels: map[string]string{
					"instance": "server2",
					"job":      "node_exporter",
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
		},
		hash: "828aa22d70e6d953eee0ea9f2c80f8b3df9ee775",
		id:   "0b1963665aac588dc4b18e17c7a4f70466c622ea",
		stateCount: map[string]int{
			models.AlertStateActive:      1,
			models.AlertStateSuppressed:  0,
			models.AlertStateUnprocessed: 0,
		},
	},
	groupTest{
		receiver: "by-cluster-service",
		labels: map[string]string{
			"alertname": "Host_Down",
			"cluster":   "staging",
		},
		alerts: []models.Alert{
			models.Alert{
				Annotations: models.Annotations{},
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Labels: map[string]string{
					"instance": "server3",
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
			models.Alert{
				Annotations: models.Annotations{},
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Labels: map[string]string{
					"instance": "server4",
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
			models.Alert{
				Annotations: models.Annotations{},
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Labels: map[string]string{
					"instance": "server5",
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
		},
		hash: "db53e38245a7afe18f923518146326b6fe53109a",
		id:   "2d3f39413b41c873cb72e0b8065aa7b8631e983e",
		shared: models.APIAlertGroupSharedMaps{
			Annotations: models.Annotations{
				models.Annotation{},
			},
			Labels: map[string]string{
				"job": "node_ping",
			},
		},
		stateCount: map[string]int{
			models.AlertStateActive:      3,
			models.AlertStateSuppressed:  0,
			models.AlertStateUnprocessed: 0,
		},
	},
	groupTest{
		receiver: "by-cluster-service",
		labels: map[string]string{
			"alertname": "Host_Down",
			"cluster":   "dev",
		},
		alerts: []models.Alert{
			models.Alert{
				Annotations: models.Annotations{},
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateSuppressed,
						Source:     "localhost/prometheus",
						SilencedBy: []string{"168f139d-77e4-41d6-afb5-8fe2cfd0cc9d"},
					},
				},
				Labels: map[string]string{
					"instance": "server6",
				},
				State:    models.AlertStateSuppressed,
				Receiver: "by-cluster-service",
			},
			models.Alert{
				Annotations: models.Annotations{},
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateSuppressed,
						Source:     "localhost/prometheus",
						SilencedBy: []string{"168f139d-77e4-41d6-afb5-8fe2cfd0cc9d", "378eaa69-097d-41c4-a8c2-fe6568c3abfc"},
					},
				},
				Labels: map[string]string{
					"instance": "server7",
				},
				State:    models.AlertStateSuppressed,
				Receiver: "by-cluster-service",
			},
			models.Alert{
				Annotations: models.Annotations{},
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateSuppressed,
						Source:     "localhost/prometheus",
						SilencedBy: []string{"168f139d-77e4-41d6-afb5-8fe2cfd0cc9d"},
					},
				},
				Labels: map[string]string{
					"instance": "server8",
				},
				State:    models.AlertStateSuppressed,
				Receiver: "by-cluster-service",
			},
		},
		hash: "bcb440cdee1d6f818599cf405c40f3382a4b1229",
		id:   "3c09c4156e6784dcf6d5b2e1629253798f82909b",
		shared: models.APIAlertGroupSharedMaps{
			Annotations: models.Annotations{
				models.Annotation{Visible: true, Name: "summary", Value: "Example summary"},
			},
			Labels: map[string]string{
				"job": "node_ping",
			},
		},
		stateCount: map[string]int{
			models.AlertStateActive:      0,
			models.AlertStateSuppressed:  3,
			models.AlertStateUnprocessed: 0,
		},
	},
	groupTest{
		receiver: "by-name",
		labels: map[string]string{
			"alertname": "Host_Down",
		},
		alerts: []models.Alert{
			models.Alert{
				Annotations: models.Annotations{
					models.Annotation{Visible: true, Name: "url", Value: "http://localhost/example.html", IsLink: true},
				},
				Labels: map[string]string{
					"cluster":  "prod",
					"instance": "server1",
				},
				State: models.AlertStateActive,
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Receiver: "by-name",
			},
			models.Alert{
				Annotations: models.Annotations{},
				Labels: map[string]string{
					"cluster":  "prod",
					"instance": "server2",
				},
				State: models.AlertStateActive,
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Receiver: "by-name",
			},
			models.Alert{
				Annotations: models.Annotations{},
				Labels: map[string]string{
					"cluster":  "staging",
					"instance": "server3",
				},
				State: models.AlertStateActive,
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Receiver: "by-name",
			},
			models.Alert{
				Annotations: models.Annotations{},
				Labels: map[string]string{
					"cluster":  "staging",
					"instance": "server4",
				},
				State: models.AlertStateActive,
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Receiver: "by-name",
			},
			models.Alert{
				Annotations: models.Annotations{},
				Labels: map[string]string{
					"cluster":  "staging",
					"instance": "server5",
				},
				State: models.AlertStateActive,
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Receiver: "by-name",
			},
			models.Alert{
				Annotations: models.Annotations{},
				Labels: map[string]string{
					"cluster":  "dev",
					"instance": "server6",
				},
				State: models.AlertStateSuppressed,
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateSuppressed,
						Source:     "localhost/prometheus",
						SilencedBy: []string{"168f139d-77e4-41d6-afb5-8fe2cfd0cc9d"},
					},
				},
				Receiver: "by-name",
			},
			models.Alert{
				Annotations: models.Annotations{},
				Labels: map[string]string{
					"cluster":  "dev",
					"instance": "server7",
				},
				State: models.AlertStateSuppressed,
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateSuppressed,
						Source:     "localhost/prometheus",
						SilencedBy: []string{"168f139d-77e4-41d6-afb5-8fe2cfd0cc9d", "378eaa69-097d-41c4-a8c2-fe6568c3abfc"},
					},
				},
				Receiver: "by-name",
			},
			models.Alert{
				Annotations: models.Annotations{},
				Labels: map[string]string{
					"cluster":  "dev",
					"instance": "server8",
				},
				State: models.AlertStateSuppressed,
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateSuppressed,
						Source:     "localhost/prometheus",
						SilencedBy: []string{"168f139d-77e4-41d6-afb5-8fe2cfd0cc9d"},
					},
				},
				Receiver: "by-name",
			},
		},
		id:   "58c6a3467cebc53abe68ecbe8643ce478c5a1573",
		hash: "68d0ac6e27b890e0f854611963b03b51b37242cf",
		shared: models.APIAlertGroupSharedMaps{
			Annotations: models.Annotations{
				models.Annotation{Visible: true, Name: "summary", Value: "Example summary"},
			},
			Labels: map[string]string{
				"job": "node_ping",
			},
		},
		stateCount: map[string]int{
			models.AlertStateActive:      5,
			models.AlertStateSuppressed:  3,
			models.AlertStateUnprocessed: 0,
		},
	},
	groupTest{
		receiver: "by-cluster-service",
		labels: map[string]string{
			"alertname": "Free_Disk_Space_Too_Low",
			"cluster":   "staging",
		},
		alerts: []models.Alert{
			models.Alert{
				Annotations: models.Annotations{
					models.Annotation{Visible: true, Name: "alert", Value: "Less than 10% disk space is free"},
					models.Annotation{Visible: true, Name: "dashboard", Value: "http://localhost/dashboard.html", IsLink: true},
				},
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Labels: map[string]string{
					"instance": "server5",
					"job":      "node_exporter",
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
		},
		hash: "4917eff113e7d22d7f1e5dba1e6dbb6d7f0969ad",
		id:   "8ca8151d9e30baba2334507dca53e16b7be93c5e",
		stateCount: map[string]int{
			models.AlertStateActive:      1,
			models.AlertStateSuppressed:  0,
			models.AlertStateUnprocessed: 0,
		},
	},
	groupTest{
		receiver: "by-cluster-service",
		labels: map[string]string{
			"alertname": "Host_Down",
			"cluster":   "prod",
		},
		alerts: []models.Alert{
			models.Alert{
				Annotations: models.Annotations{
					models.Annotation{Visible: true, Name: "url", Value: "http://localhost/example.html", IsLink: true},
				},
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Labels: map[string]string{
					"instance": "server1",
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
			models.Alert{
				Annotations: models.Annotations{},
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Labels: map[string]string{
					"instance": "server2",
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
		},
		hash: "eee0a9960be86ab7308f50a8ff438caed5cf8540",
		id:   "98c1a53d0f71af9c734c9180697383f3b8aff80f",
		shared: models.APIAlertGroupSharedMaps{
			Annotations: models.Annotations{
				models.Annotation{Visible: true, Name: "summary", Value: "Example summary"},
			},
			Labels: map[string]string{
				"job": "node_ping",
			},
		},
		stateCount: map[string]int{
			models.AlertStateActive:      2,
			models.AlertStateSuppressed:  0,
			models.AlertStateUnprocessed: 0,
		},
	},
	groupTest{
		receiver: "by-name",
		labels: map[string]string{
			"alertname": "HTTP_Probe_Failed",
		},
		alerts: []models.Alert{
			models.Alert{
				Annotations: models.Annotations{
					models.Annotation{Visible: true, Name: "help", Value: "Example help annotation"},
					models.Annotation{Visible: true, Name: "url", Value: "http://localhost/example.html", IsLink: true},
				},
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:   "default",
						State:  models.AlertStateSuppressed,
						Source: "localhost/prometheus",
					},
				},
				Labels: map[string]string{
					"instance": "web1",
				},
				State:    models.AlertStateSuppressed,
				Receiver: "by-name",
			},
			models.Alert{
				Annotations: models.Annotations{},
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Labels: map[string]string{
					"instance": "web2",
				},
				State:    models.AlertStateActive,
				Receiver: "by-name",
			},
		},
		hash: "cc1b20a6b0ded9265ab96699638d844a4c992614",
		id:   "bc4845fec77585cdfebe946234279d785ca93891",
		shared: models.APIAlertGroupSharedMaps{
			Annotations: models.Annotations{
				models.Annotation{Visible: true, Name: "summary", Value: "Example summary"},
			},
			Labels: map[string]string{
				"cluster": "dev",
				"job":     "node_exporter",
			},
		},
		stateCount: map[string]int{
			models.AlertStateActive:      1,
			models.AlertStateSuppressed:  1,
			models.AlertStateUnprocessed: 0,
		},
	},
	groupTest{
		receiver: "by-name",
		labels: map[string]string{
			"alertname": "Free_Disk_Space_Too_Low",
		},
		alerts: []models.Alert{
			models.Alert{
				Annotations: models.Annotations{
					models.Annotation{Visible: true, Name: "alert", Value: "Less than 10% disk space is free"},
					models.Annotation{Visible: true, Name: "dashboard", Value: "http://localhost/dashboard.html", IsLink: true},
				},
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Labels: map[string]string{
					"cluster":  "staging",
					"instance": "server5",
					"job":      "node_exporter",
				},
				State:    models.AlertStateActive,
				Receiver: "by-name",
			},
		},
		hash: "a596259a6ff3d8a5fdabf1a91c6d2b7e680d05d7",
		id:   "bf78806d2a80b1c8150c1391669813722428e858",
		stateCount: map[string]int{
			models.AlertStateActive:      1,
			models.AlertStateSuppressed:  0,
			models.AlertStateUnprocessed: 0,
		},
	},
	groupTest{
		receiver: "by-cluster-service",
		labels: map[string]string{
			"alertname": "HTTP_Probe_Failed",
			"cluster":   "dev",
		},
		alerts: []models.Alert{
			models.Alert{
				Annotations: models.Annotations{
					models.Annotation{Visible: true, Name: "help", Value: "Example help annotation"},
					models.Annotation{Visible: true, Name: "url", Value: "http://localhost/example.html", IsLink: true},
				},
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateSuppressed,
						Source:     "localhost/prometheus",
						SilencedBy: []string{"0804764c-6163-4c64-b0a9-08feebe2db4b"},
					},
				},
				Labels: map[string]string{
					"instance": "web1",
				},
				State:    models.AlertStateSuppressed,
				Receiver: "by-cluster-service",
			},
			models.Alert{
				Annotations: models.Annotations{},
				Alertmanager: []models.AlertmanagerInstance{
					models.AlertmanagerInstance{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Labels: map[string]string{
					"instance": "web2",
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
		},
		hash: "1dd655dc8ac8ed51aca51a702e70b1a2f442f434",
		id:   "ecefc3705b1ab4e4c3283c879540be348d2d9dce",
		shared: models.APIAlertGroupSharedMaps{
			Annotations: models.Annotations{},
			Labels: map[string]string{
				"job": "node_exporter",
			},
		},
		stateCount: map[string]int{
			models.AlertStateActive:      1,
			models.AlertStateSuppressed:  1,
			models.AlertStateUnprocessed: 0,
		},
	},
}

var filtersExpected = []models.Filter{}

func compareAlertGroups(testCase groupTest, group models.APIAlertGroup) bool {
	if testCase.receiver != group.Receiver {
		return false
	}
	if len(testCase.labels) != len(group.Labels) {
		return false
	}
	for key, val := range testCase.labels {
		v, found := group.Labels[key]
		if !found {
			return false
		}
		if val != v {
			return false
		}
	}
	return true
}

func compareAlerts(expectedAlert, gotAlert models.Alert) bool {
	if gotAlert.Receiver != expectedAlert.Receiver {
		return false
	}
	if len(gotAlert.Labels) != len(expectedAlert.Labels) {
		return false
	}
	for key, val := range expectedAlert.Labels {
		v, found := gotAlert.Labels[key]
		if !found {
			return false
		}
		if val != v {
			return false
		}
	}
	return true
}

func testAlert(version string, t *testing.T, expectedAlert, gotAlert models.Alert) {
	if gotAlert.Receiver != expectedAlert.Receiver {
		t.Errorf("[%s] Expected '%s' receiver but got '%s' on alert labels=%v",
			version, expectedAlert.Receiver, gotAlert.Receiver, expectedAlert.Labels)
	}
	if gotAlert.State != expectedAlert.State {
		t.Errorf("[%s] Expected state '%s' but got '%s' on alert receiver='%s' labels=%v",
			version, expectedAlert.State, gotAlert.State, gotAlert.Receiver, expectedAlert.Labels)
	}
	if !reflect.DeepEqual(gotAlert.Annotations, expectedAlert.Annotations) {
		t.Errorf("[%s] Annotation mismatch on alert receiver='%s' labels=%v, expected %v but got %v",
			version, expectedAlert.Receiver, expectedAlert.Labels, expectedAlert.Annotations, gotAlert.Annotations)
	}
	if !reflect.DeepEqual(gotAlert.Labels, expectedAlert.Labels) {
		t.Errorf("[%s] Labels mismatch on alert receiver='%s', expected labels=%v but got %v",
			version, expectedAlert.Receiver, expectedAlert.Labels, gotAlert.Labels)
	}
	if len(gotAlert.Alertmanager) != len(expectedAlert.Alertmanager) {
		t.Errorf("[%s] Expected %d alertmanager instances but got %d on alert receiver='%s' labels=%v",
			version, len(expectedAlert.Alertmanager), len(gotAlert.Alertmanager), gotAlert.Receiver, expectedAlert.Labels)
	}
	for _, expectedAM := range expectedAlert.Alertmanager {
		found := false
		for _, gotAM := range gotAlert.Alertmanager {
			if gotAM.Name == expectedAM.Name {
				found = true
				if gotAM.State != expectedAM.State {
					t.Errorf("[%s] Expected alertmanager '%s' to have state '%s' but got '%s' on alert receiver='%s' labels=%v",
						version, expectedAM.Name, expectedAM.State, gotAM.State, gotAlert.Receiver, expectedAlert.Labels)
				}
				if gotAM.Source != expectedAM.Source {
					t.Errorf("[%s] Expected alertmanager '%s' to have source '%s' but got '%s' on alert receiver='%s' labels=%v",
						version, expectedAM.Name, expectedAM.Source, gotAM.Source, gotAlert.Receiver, expectedAlert.Labels)
				}
				// multiple silences only work for >=0.6.1
				versionRange := semver.MustParseRange(">=0.6.1")
				if versionRange(semver.MustParse(version)) {
					if len(gotAM.Silences) != len(expectedAM.Silences) {
						t.Errorf("[%s] Expected alertmanager '%s' to have %d silences but got %d on alert receiver='%s' labels=%v",
							version, expectedAM.Name, len(expectedAM.Silences), len(gotAM.Silences), gotAlert.Receiver, expectedAlert.Labels)
					}
					for _, es := range expectedAM.Silences {
						foundSilence := false
						for _, gs := range gotAM.Silences {
							if es.Comment == gs.Comment &&
								es.CreatedBy == gs.CreatedBy &&
								es.JiraID == gs.JiraID &&
								es.JiraURL == gs.JiraURL {
								foundSilence = true
							}
						}
						if !foundSilence {
							t.Errorf("[%s] Silence %v not found on alertmanager '%s' on alert receiver='%s' labels=%v",
								version, es, expectedAM.Name, expectedAlert.Receiver, expectedAlert.Labels)
						}
					}
				}
				break
			}
		}
		if !found {
			t.Errorf("[%s] Alertmanager instances '%s' not found on alert receiver='%s' labels=%v",
				version, expectedAM.Name, gotAlert.Receiver, expectedAlert.Labels)
		}
	}
}

func testAlertGroup(version string, t *testing.T, testCase groupTest, group models.APIAlertGroup) {
	//if testCase.hash != group.Hash {
	// FIXME this is different per mock version due to startsAt / endsAt
	// t.Errorf("[%s] Alert group.Hash mismatch, expected '%s' but got '%s' for group %v",
	// version, testCase.hash, group.Hash, group.Labels)
	//}
	if testCase.id != group.ID {
		t.Errorf("[%s] Alert group.ID mismatch, expected '%s' but got '%s' for group %v",
			version, testCase.id, group.ID, group.Labels)
	}
	for key, val := range testCase.stateCount {
		v, found := group.StateCount[key]
		if !found {
			t.Errorf("[%s] Expected group.StateCount[%s]=%d not found", version, key, val)
		} else if v != val {
			t.Errorf("[%s] group.StateCount[%s] mismatch, expected %d but got %d", version, key, val, v)
		}
	}
	if len(testCase.alerts) != len(group.Alerts) {
		t.Errorf("[%s] Expected %d alert(s) but got %d on alert group receiver='%s' labels=%v",
			version, len(testCase.alerts), len(group.Alerts), testCase.receiver, testCase.labels)
	}
	for _, expectedAlert := range testCase.alerts {
		alertFound := false
		for _, alert := range group.Alerts {
			match := compareAlerts(expectedAlert, alert)
			if match {
				alertFound = true
				testAlert(version, t, expectedAlert, alert)
			}
		}
		if !alertFound {
			t.Errorf("[%s] Expected alert receiver='%s' labels=%v not found in group: %v",
				version, expectedAlert.Receiver, expectedAlert.Labels, group.Alerts)
		}
	}
}

func TestVerifyAllGroups(t *testing.T) {
	mockConfig()
	for _, version := range mock.ListAllMocks() {
		t.Logf("Testing API using mock files from Alertmanager %s", version)
		mockAlerts(version)
		r := ginTestEngine()
		req := httptest.NewRequest("GET", "/alerts.json", nil)
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != http.StatusOK {
			t.Errorf("GET /alerts.json returned status %d", resp.Code)
		}

		ur := models.AlertsResponse{}
		err := json.Unmarshal(resp.Body.Bytes(), &ur)
		if err != nil {
			t.Errorf("Failed to unmarshal response: %s", err)
		}

		if len(ur.AlertGroups) != len(groupTests) {
			t.Errorf("[%s] Got %d alert(s) in response, expected %d",
				version, len(ur.AlertGroups), len(groupTests))
		}
		for _, testCase := range groupTests {
			groupFound := false
			for _, group := range ur.AlertGroups {
				if compareAlertGroups(testCase, group) {
					groupFound = true
					testAlertGroup(version, t, testCase, group)
				}
			}
			if !groupFound {
				t.Errorf("[%s] Expected alert group not found receiver='%s' labels=%v",
					version, testCase.receiver, testCase.labels)
			}
		}

		am, foundAM := ur.Silences["843c4a11660fe38ea61e6960a29d4f4796da6488"]
		if !foundAM {
			t.Errorf("[%s] Alertmanager cluster '843c4a11660fe38ea61e6960a29d4f4796da6488' (default) missing from silences", version)
		} else if len(am) == 0 {
			t.Errorf("[%s] Silences mismatch, expected >0 but got %d", version, len(am))
		}

		if !reflect.DeepEqual(ur.Filters, filtersExpected) {
			t.Errorf("[%s] Filters mismatch, expected %v but got %v", version, filtersExpected, ur.Filters)
		}
	}
}
