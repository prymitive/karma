package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/Masterminds/semver/v3"
	"github.com/google/go-cmp/cmp"

	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/mock"
	"github.com/prymitive/karma/internal/models"
)

type groupTest struct {
	labels     models.Labels
	receiver   string
	alerts     []models.Alert
	id         string
	stateCount map[string]int
}

var groupTests = []groupTest{
	{
		receiver: "by-name",
		labels: models.Labels{
			{Name: "alertname", Value: "Memory_Usage_Too_High"},
		},
		alerts: []models.Alert{
			{
				StartsAt: time.Date(2019, time.January, 10, 0, 0, 0, 0, time.UTC),
				Annotations: models.Annotations{
					models.Annotation{Visible: true, Name: "alert", Value: "Memory usage exceeding threshold"},
					models.Annotation{Visible: true, Name: "dashboard", Value: "http://localhost/dashboard.html", IsLink: true},
				},
				Labels: models.Labels{
					{Name: "cluster", Value: "prod"},
					{Name: "instance", Value: "server2"},
					{Name: "job", Value: "node_exporter"},
				},
				State: models.AlertStateActive,
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Receiver: "by-name",
			},
		},
		id: "990fb0cdc86aae89",
		stateCount: map[string]int{
			models.AlertStateActive:      1,
			models.AlertStateSuppressed:  0,
			models.AlertStateUnprocessed: 0,
		},
	},
	{
		receiver: "by-cluster-service",
		labels: models.Labels{
			{Name: "alertname", Value: "Memory_Usage_Too_High"},
			{Name: "cluster", Value: "prod"},
		},
		alerts: []models.Alert{
			{
				StartsAt: time.Date(2019, time.January, 10, 0, 0, 0, 1, time.UTC),
				Annotations: models.Annotations{
					models.Annotation{Visible: true, Name: "alert", Value: "Memory usage exceeding threshold"},
					models.Annotation{Visible: true, Name: "dashboard", Value: "http://localhost/dashboard.html", IsLink: true},
				},
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Labels: models.Labels{
					{Name: "instance", Value: "server2"},
					{Name: "job", Value: "node_exporter"},
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
		},
		id: "6b15d34b0ed69d02",
		stateCount: map[string]int{
			models.AlertStateActive:      1,
			models.AlertStateSuppressed:  0,
			models.AlertStateUnprocessed: 0,
		},
	},
	{
		receiver: "by-cluster-service",
		labels: models.Labels{
			{Name: "alertname", Value: "Host_Down"},
			{Name: "cluster", Value: "staging"},
		},
		alerts: []models.Alert{
			{
				StartsAt:    time.Date(2019, time.January, 10, 0, 0, 0, 0, time.UTC),
				Annotations: models.Annotations{},
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Labels: models.Labels{
					{Name: "instance", Value: "server3"},
					{Name: "ip", Value: "127.0.0.3"},
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
			{
				Annotations: models.Annotations{},
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Labels: models.Labels{
					{Name: "instance", Value: "server4"},
					{Name: "ip", Value: "127.0.0.4"},
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
			{
				Annotations: models.Annotations{},
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Labels: models.Labels{
					{Name: "instance", Value: "server5"},
					{Name: "ip", Value: "127.0.0.5"},
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
		},
		id: "f08998b6581752f4",
		stateCount: map[string]int{
			models.AlertStateActive:      3,
			models.AlertStateSuppressed:  0,
			models.AlertStateUnprocessed: 0,
		},
	},
	{
		receiver: "by-cluster-service",
		labels: models.Labels{
			{Name: "alertname", Value: "Host_Down"},
			{Name: "cluster", Value: "dev"},
		},
		alerts: []models.Alert{
			{
				StartsAt:    time.Date(2019, time.January, 10, 1, 0, 0, 0, time.UTC),
				Annotations: models.Annotations{},
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateSuppressed,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{"168f139d-77e4-41d6-afb5-8fe2cfd0cc9d"},
					},
				},
				Labels: models.Labels{
					{Name: "instance", Value: "server6"},
					{Name: "ip", Value: "127.0.0.6"},
				},
				State:    models.AlertStateSuppressed,
				Receiver: "by-cluster-service",
			},
			{
				StartsAt:    time.Date(2019, time.January, 10, 0, 59, 0, 0, time.UTC),
				Annotations: models.Annotations{},
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateSuppressed,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{"168f139d-77e4-41d6-afb5-8fe2cfd0cc9d", "378eaa69-097d-41c4-a8c2-fe6568c3abfc"},
					},
				},
				Labels: models.Labels{
					{Name: "instance", Value: "server7"},
					{Name: "ip", Value: "127.0.0.7"},
				},
				State:    models.AlertStateSuppressed,
				Receiver: "by-cluster-service",
			},
			{
				StartsAt:    time.Date(2019, time.January, 12, 0, 0, 0, 0, time.UTC),
				Annotations: models.Annotations{},
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateSuppressed,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{"168f139d-77e4-41d6-afb5-8fe2cfd0cc9d"},
					},
				},
				Labels: models.Labels{
					{Name: "instance", Value: "server8"},
					{Name: "ip", Value: "127.0.0.8"},
				},
				State:    models.AlertStateSuppressed,
				Receiver: "by-cluster-service",
			},
		},
		id: "97dba9e211f41cf6",
		stateCount: map[string]int{
			models.AlertStateActive:      0,
			models.AlertStateSuppressed:  3,
			models.AlertStateUnprocessed: 0,
		},
	},
	{
		receiver: "by-name",
		labels: models.Labels{
			{Name: "alertname", Value: "Host_Down"},
		},
		alerts: []models.Alert{
			{
				StartsAt: time.Date(2019, time.January, 1, 0, 0, 0, 0, time.UTC),
				Annotations: models.Annotations{
					models.Annotation{Visible: true, Name: "url", Value: "http://localhost/example.html", IsLink: true},
				},
				Labels: models.Labels{
					{Name: "cluster", Value: "prod"},
					{Name: "instance", Value: "server1"},
					{Name: "ip", Value: "127.0.0.1"},
				},
				State: models.AlertStateActive,
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Receiver: "by-name",
			},
			{
				StartsAt:    time.Date(2019, time.January, 1, 0, 1, 0, 0, time.UTC),
				Annotations: models.Annotations{},
				Labels: models.Labels{
					{Name: "cluster", Value: "prod"},
					{Name: "instance", Value: "server2"},
					{Name: "ip", Value: "127.0.0.2"},
				},
				State: models.AlertStateActive,
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Receiver: "by-name",
			},
			{
				StartsAt:    time.Date(2019, time.January, 1, 0, 1, 0, 1, time.UTC),
				Annotations: models.Annotations{},
				Labels: models.Labels{
					{Name: "cluster", Value: "staging"},
					{Name: "instance", Value: "server3"},
					{Name: "ip", Value: "127.0.0.3"},
				},
				State: models.AlertStateActive,
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Receiver: "by-name",
			},
			{
				StartsAt:    time.Date(2019, time.January, 1, 0, 0, 59, 0, time.UTC),
				Annotations: models.Annotations{},
				Labels: models.Labels{
					{Name: "cluster", Value: "staging"},
					{Name: "instance", Value: "server4"},
					{Name: "ip", Value: "127.0.0.4"},
				},
				State: models.AlertStateActive,
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Receiver: "by-name",
			},
			{
				StartsAt:    time.Date(2019, time.January, 10, 0, 0, 0, 0, time.UTC),
				Annotations: models.Annotations{},
				Labels: models.Labels{
					{Name: "cluster", Value: "staging"},
					{Name: "instance", Value: "server5"},
					{Name: "ip", Value: "127.0.0.5"},
				},
				State: models.AlertStateActive,
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Receiver: "by-name",
			},
			{
				StartsAt:    time.Date(2019, time.January, 10, 1, 0, 0, 0, time.UTC),
				Annotations: models.Annotations{},
				Labels: models.Labels{
					{Name: "cluster", Value: "dev"},
					{Name: "instance", Value: "server6"},
					{Name: "ip", Value: "127.0.0.6"},
				},
				State: models.AlertStateSuppressed,
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateSuppressed,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{"168f139d-77e4-41d6-afb5-8fe2cfd0cc9d"},
					},
				},
				Receiver: "by-name",
			},
			{
				StartsAt:    time.Date(2019, time.January, 10, 0, 20, 0, 0, time.UTC),
				Annotations: models.Annotations{},
				Labels: models.Labels{
					{Name: "cluster", Value: "dev"},
					{Name: "instance", Value: "server7"},
					{Name: "ip", Value: "127.0.0.7"},
				},
				State: models.AlertStateSuppressed,
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateSuppressed,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{"168f139d-77e4-41d6-afb5-8fe2cfd0cc9d", "378eaa69-097d-41c4-a8c2-fe6568c3abfc"},
					},
				},
				Receiver: "by-name",
			},
			{
				StartsAt:    time.Date(2019, time.January, 10, 0, 21, 0, 0, time.UTC),
				Annotations: models.Annotations{},
				Labels: models.Labels{
					{Name: "cluster", Value: "dev"},
					{Name: "instance", Value: "server8"},
					{Name: "ip", Value: "127.0.0.8"},
				},
				State: models.AlertStateSuppressed,
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateSuppressed,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{"168f139d-77e4-41d6-afb5-8fe2cfd0cc9d"},
					},
				},
				Receiver: "by-name",
			},
		},
		id: "db6e3af075b36419",
		stateCount: map[string]int{
			models.AlertStateActive:      5,
			models.AlertStateSuppressed:  3,
			models.AlertStateUnprocessed: 0,
		},
	},
	{
		receiver: "by-cluster-service",
		labels: models.Labels{
			{Name: "alertname", Value: "Free_Disk_Space_Too_Low"},
			{Name: "cluster", Value: "staging"},
		},
		alerts: []models.Alert{
			{
				StartsAt: time.Date(2019, time.January, 10, 0, 19, 0, 0, time.UTC),
				Annotations: models.Annotations{
					models.Annotation{Visible: true, Name: "alert", Value: "Less than 10% disk space is free"},
					models.Annotation{Visible: true, Name: "dashboard", Value: "http://localhost/dashboard.html", IsLink: true},
				},
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Labels: models.Labels{
					{Name: "disk", Value: "sda"},
					{Name: "instance", Value: "server5"},
					{Name: "job", Value: "node_exporter"},
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
		},
		id: "c8a1ec76d51e9d96",
		stateCount: map[string]int{
			models.AlertStateActive:      1,
			models.AlertStateSuppressed:  0,
			models.AlertStateUnprocessed: 0,
		},
	},
	{
		receiver: "by-cluster-service",
		labels: models.Labels{
			{Name: "alertname", Value: "Host_Down"},
			{Name: "cluster", Value: "prod"},
		},
		alerts: []models.Alert{
			{
				StartsAt: time.Date(2019, time.January, 12, 0, 19, 0, 0, time.UTC),
				Annotations: models.Annotations{
					models.Annotation{Visible: true, Name: "url", Value: "http://localhost/example.html", IsLink: true},
				},
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Labels: models.Labels{
					{Name: "instance", Value: "server1"},
					{Name: "ip", Value: "127.0.0.1"},
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
			{
				Annotations: models.Annotations{},
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Labels: models.Labels{
					{Name: "instance", Value: "server2"},
					{Name: "ip", Value: "127.0.0.2"},
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
		},
		id: "922d04650baba3fe",
		stateCount: map[string]int{
			models.AlertStateActive:      2,
			models.AlertStateSuppressed:  0,
			models.AlertStateUnprocessed: 0,
		},
	},
	{
		receiver: "by-name",
		labels: models.Labels{
			{Name: "alertname", Value: "HTTP_Probe_Failed"},
		},
		alerts: []models.Alert{
			{
				StartsAt: time.Date(2019, time.January, 14, 0, 0, 0, 0, time.UTC),
				Annotations: models.Annotations{
					models.Annotation{Visible: true, Name: "help", Value: "Example help annotation"},
					models.Annotation{Visible: true, Name: "url", Value: "http://localhost/example.html", IsLink: true},
				},
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:   "default",
						State:  models.AlertStateSuppressed,
						Source: "http://localhost/prometheus",
					},
				},
				Labels: models.Labels{
					{Name: "instance", Value: "web1"},
				},
				State:    models.AlertStateSuppressed,
				Receiver: "by-name",
			},
			{
				StartsAt:    time.Date(2019, time.January, 14, 0, 0, 0, 0, time.UTC),
				Annotations: models.Annotations{},
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Labels: models.Labels{
					{Name: "instance", Value: "web2"},
				},
				State:    models.AlertStateActive,
				Receiver: "by-name",
			},
		},
		id: "69b99170489a6c64",
		stateCount: map[string]int{
			models.AlertStateActive:      1,
			models.AlertStateSuppressed:  1,
			models.AlertStateUnprocessed: 0,
		},
	},
	{
		receiver: "by-name",
		labels: models.Labels{
			{Name: "alertname", Value: "Free_Disk_Space_Too_Low"},
		},
		alerts: []models.Alert{
			{
				StartsAt: time.Date(2019, time.January, 15, 0, 0, 0, 0, time.UTC),
				Annotations: models.Annotations{
					models.Annotation{Visible: true, Name: "alert", Value: "Less than 10% disk space is free"},
					models.Annotation{Visible: true, Name: "dashboard", Value: "http://localhost/dashboard.html", IsLink: true},
				},
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Labels: models.Labels{
					{Name: "cluster", Value: "staging"},
					{Name: "disk", Value: "sda"},
					{Name: "instance", Value: "server5"},
					{Name: "job", Value: "node_exporter"},
				},
				State:    models.AlertStateActive,
				Receiver: "by-name",
			},
		},
		id: "37f9b50559e97fd0",
		stateCount: map[string]int{
			models.AlertStateActive:      1,
			models.AlertStateSuppressed:  0,
			models.AlertStateUnprocessed: 0,
		},
	},
	{
		receiver: "by-cluster-service",
		labels: models.Labels{
			{Name: "alertname", Value: "HTTP_Probe_Failed"},
			{Name: "cluster", Value: "dev"},
		},
		alerts: []models.Alert{
			{
				StartsAt: time.Date(2019, time.January, 10, 20, 0, 0, 0, time.UTC),
				Annotations: models.Annotations{
					models.Annotation{Visible: true, Name: "help", Value: "Example help annotation"},
					models.Annotation{Visible: true, Name: "url", Value: "http://localhost/example.html", IsLink: true},
				},
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateSuppressed,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{"0804764c-6163-4c64-b0a9-08feebe2db4b"},
					},
				},
				Labels: models.Labels{
					{Name: "instance", Value: "web1"},
				},
				State:    models.AlertStateSuppressed,
				Receiver: "by-cluster-service",
			},
			{
				StartsAt:    time.Date(2019, time.January, 10, 19, 0, 0, 0, time.UTC),
				Annotations: models.Annotations{},
				Alertmanager: []models.AlertmanagerInstance{
					{
						Name:       "default",
						State:      models.AlertStateActive,
						Source:     "http://localhost/prometheus",
						SilencedBy: []string{},
					},
				},
				Labels: models.Labels{
					{Name: "instance", Value: "web2"},
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
		},
		id: "ca10a29d2e729cff",
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
	for _, l := range testCase.labels {
		v := group.Labels.Get(l.Name)
		if v == nil {
			return false
		}
		if l.Value != v.Value {
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
	for _, l := range expectedAlert.Labels {
		v := gotAlert.Labels.Get(l.Name)
		if v == nil {
			return false
		}
		if l.Value != v.Value {
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
				versionRange, err := semver.NewConstraint(">=0.6.1")
				if err != nil {
					t.Errorf("[%s] Cannot create semver Constrain: %s", version, err)
				}
				if versionRange.Check(semver.MustParse(version)) {
					if len(gotAM.Silences) != len(expectedAM.Silences) {
						t.Errorf("[%s] Expected alertmanager '%s' to have %d silences but got %d on alert receiver='%s' labels=%v",
							version, expectedAM.Name, len(expectedAM.Silences), len(gotAM.Silences), gotAlert.Receiver, expectedAlert.Labels)
					}
					for _, es := range expectedAM.Silences {
						foundSilence := false
						for _, gs := range gotAM.Silences {
							if es.Comment == gs.Comment &&
								es.CreatedBy == gs.CreatedBy &&
								es.TicketID == gs.TicketID &&
								es.TicketURL == gs.TicketURL {
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
	payload, err := json.Marshal(models.AlertsRequest{
		Filters:           []string{},
		GridLimits:        map[string]int{},
		DefaultGroupLimit: 50,
	})
	if err != nil {
		t.Error(err)
		t.FailNow()
	}

	mockConfig(t.Setenv)
	for _, version := range mock.ListAllMocks() {
		t.Logf("Testing API using mock files from Alertmanager %s", version)
		mockAlerts(version)
		apiCache.Purge()
		r := testRouter()
		setupRouter(r, nil)
		req := httptest.NewRequest("POST", "/alerts.json", bytes.NewReader(payload))
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != http.StatusOK {
			t.Errorf("POST /alerts.json returned status %d", resp.Code)
		}

		ur := models.AlertsResponse{}
		err := json.Unmarshal(resp.Body.Bytes(), &ur)
		if err != nil {
			t.Errorf("Failed to unmarshal response: %s", err)
		}

		if len(ur.Grids[0].AlertGroups) != len(groupTests) {
			t.Errorf("[%s] Got %d alert(s) in response, expected %d",
				version, len(ur.Grids[0].AlertGroups), len(groupTests))
		}
		for _, testCase := range groupTests {
			groupFound := false
			for _, group := range ur.Grids[0].AlertGroups {
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

		am, foundAM := ur.Silences["default"]
		if !foundAM {
			t.Errorf("[%s] Alertmanager cluster 'default' missing from silences", version)
			for name := range ur.Silences {
				t.Logf("Cluster: %s", name)
			}
		} else if len(am) == 0 {
			t.Errorf("[%s] Silences mismatch, expected >0 but got %d", version, len(am))
		}

		if !reflect.DeepEqual(ur.Filters, filtersExpected) {
			t.Errorf("[%s] Filters mismatch, expected %v but got %v", version, filtersExpected, ur.Filters)
		}

		expectedReceivers := []string{"by-cluster-service", "by-name"}
		if diff := cmp.Diff(expectedReceivers, ur.Receivers); diff != "" {
			t.Errorf("Incorrect receivers list (-want +got):\n%s", diff)
		}

		expectedLabelNames := []string{"alertname", "cluster", "disk", "instance", "ip", "job"}
		if diff := cmp.Diff(expectedLabelNames, ur.LabelNames); diff != "" {
			t.Errorf("Incorrect labelNames list (-want +got):\n%s", diff)
		}
	}
}

type sortTest struct {
	defaultSortReverse bool
	filter             []string
	sortOrder          string
	sortLabel          string
	sortReverse        bool
	expectedLabel      string
	expectedValues     []string
}

var sortTests = []sortTest{
	{
		filter:         []string{"@receiver=by-cluster-service"},
		sortOrder:      "label",
		sortLabel:      "cluster",
		sortReverse:    false,
		expectedLabel:  "cluster",
		expectedValues: []string{"dev", "dev", "prod", "prod", "staging", "staging"},
	},
	{
		filter:         []string{"@receiver=by-cluster-service"},
		sortOrder:      "label",
		sortLabel:      "cluster",
		sortReverse:    true,
		expectedLabel:  "cluster",
		expectedValues: []string{"staging", "staging", "prod", "prod", "dev", "dev"},
	},
	{
		filter:         []string{"cluster=dev"},
		sortOrder:      "label",
		sortLabel:      "cluster",
		sortReverse:    false,
		expectedLabel:  "cluster",
		expectedValues: []string{"dev", "dev", "dev", "dev"},
	},
	{
		filter:         []string{"@receiver=by-cluster-service"},
		sortOrder:      "label",
		sortLabel:      "disk",
		sortReverse:    false,
		expectedLabel:  "disk",
		expectedValues: []string{"sda", "", "", "", "", "", "", "", "", "", "", ""},
	},
	{
		filter:         []string{"@receiver=by-cluster-service"},
		sortOrder:      "label",
		sortLabel:      "disk",
		sortReverse:    true,
		expectedLabel:  "disk",
		expectedValues: []string{"", "", "", "", "", "", "", "", "", "", "", "sda"},
	},
	{
		filter:         []string{"@receiver=by-cluster-service"},
		sortOrder:      "disabled",
		sortLabel:      "",
		sortReverse:    false,
		expectedLabel:  "cluster",
		expectedValues: []string{"staging", "dev", "staging", "dev", "prod", "prod"},
	},
	{
		filter:         []string{"@receiver=by-cluster-service"},
		sortOrder:      "disabled",
		sortLabel:      "",
		sortReverse:    true,
		expectedLabel:  "cluster",
		expectedValues: []string{"prod", "prod", "dev", "staging", "dev", "staging"},
	},
	{
		filter:         []string{"@receiver=by-cluster-service"},
		sortOrder:      "",
		sortLabel:      "",
		sortReverse:    false,
		expectedLabel:  "cluster",
		expectedValues: []string{"dev", "dev", "prod", "prod", "staging", "staging"},
	},
	{
		filter:         []string{"@receiver=by-cluster-service"},
		sortOrder:      "",
		sortLabel:      "",
		sortReverse:    true,
		expectedLabel:  "cluster",
		expectedValues: []string{"staging", "staging", "prod", "prod", "dev", "dev"},
	},
	{
		filter:         []string{"@receiver=by-cluster-service"},
		sortOrder:      "label",
		sortLabel:      "job",
		sortReverse:    false,
		expectedLabel:  "job",
		expectedValues: []string{"node_exporter", "node_exporter", "node_exporter", "node_ping", "node_ping", "node_ping"},
	},
	{
		filter:         []string{"@receiver=by-cluster-service"},
		sortOrder:      "label",
		sortLabel:      "job",
		sortReverse:    true,
		expectedLabel:  "job",
		expectedValues: []string{"node_ping", "node_ping", "node_ping", "node_exporter", "node_exporter", "node_exporter"},
	},
}

func TestSortOrder(t *testing.T) {
	mockConfig(t.Setenv)
	config.Config.Grid.Sorting.Order = "label"
	config.Config.Grid.Sorting.Label = "cluster"
	config.Config.Grid.Sorting.CustomValues.Labels = map[string]map[string]string{}
	config.Config.Grid.Sorting.CustomValues.Labels["job"] = map[string]string{
		"node_exporter": "1",
		"node_ping":     "2",
	}
	for _, version := range mock.ListAllMocks() {
		for i := 1; i <= 3; i++ {
			t.Logf("Testing API using mock files from Alertmanager %s [try %d]", version, i)
			mockAlerts(version)
			r := testRouter()
			setupRouter(r, nil)

			for _, testCase := range sortTests {
				apiCache.Purge()
				config.Config.Grid.Sorting.Reverse = testCase.defaultSortReverse

				payload, err := json.Marshal(models.AlertsRequest{
					Filters:           testCase.filter,
					GridLimits:        map[string]int{},
					SortLabel:         testCase.sortLabel,
					SortOrder:         testCase.sortOrder,
					SortReverse:       testCase.sortReverse,
					DefaultGroupLimit: 5,
				})
				if err != nil {
					t.Error(err)
					t.FailNow()
				}
				req := httptest.NewRequest("POST", "/alerts.json", bytes.NewReader(payload))
				resp := httptest.NewRecorder()
				r.ServeHTTP(resp, req)
				if resp.Code != http.StatusOK {
					t.Errorf("POST /alerts.json returned status %d", resp.Code)
				}

				ur := models.AlertsResponse{}
				err = json.Unmarshal(resp.Body.Bytes(), &ur)
				if err != nil {
					t.Errorf("Failed to unmarshal response: %s", err)
				}

				if len(ur.Grids) == 0 {
					if len(testCase.expectedValues) > 0 {
						t.Errorf("Got empty grids but expected %d groups", len(testCase.expectedValues))
					}
				} else {
					values := []string{}
					for _, ag := range ur.Grids[0].AlertGroups {
						v := ag.Labels.GetValue(testCase.expectedLabel)
						if v == "" {
							v = ag.Shared.Labels.GetValue(testCase.expectedLabel)
						}
						if v != "" {
							values = append(values, v)
						} else {
							for _, alert := range ag.Alerts {
								v = alert.Labels.GetValue(testCase.expectedLabel)
								values = append(values, v)
							}
						}
					}

					if diff := cmp.Diff(testCase.expectedValues, values); diff != "" {
						t.Errorf("Incorrectly sorted values for filter=%q order=%s label=%q reverse=%v (-want +got):\n%s",
							strings.Join(testCase.filter, " "), testCase.sortOrder, testCase.sortLabel, testCase.sortReverse, diff)
					}
				}
			}
		}
	}
}

func verifyStrippedLabels(t *testing.T, labels models.Labels, keep, strip []string) {
	for _, l := range strip {
		if val := labels.Get(l); val != nil {
			t.Errorf("Found stripped label %s=%s on %v", val.Name, val.Value, labels)
		}
	}
	if len(keep) > 0 && len(strip) == 0 {
		for _, ll := range labels {
			ok := false
			for _, l := range keep {
				if ll.Name == l {
					ok = true
				}
			}
			if !ok {
				t.Errorf("Found label %s=%s that's not on the keep list: %v", ll.Name, ll.Value, keep)
			}
		}
	}
}

func TestStripLabels(t *testing.T) {
	type testCaseT struct {
		keep  []string
		strip []string
	}

	testCases := []testCaseT{
		{keep: []string{}, strip: []string{}},
		{keep: []string{}, strip: []string{"alertname"}},
		{keep: []string{"alertname"}, strip: []string{}},
	}

	payload, err := json.Marshal(models.AlertsRequest{
		Filters:           []string{},
		GridLimits:        map[string]int{},
		DefaultGroupLimit: 5,
	})
	if err != nil {
		t.Error(err)
		t.FailNow()
	}

	mockConfig(t.Setenv)
	for _, version := range mock.ListAllMocks() {
		t.Logf("Testing API using mock files from Alertmanager %s", version)
		mockAlerts(version)
		r := testRouter()
		setupRouter(r, nil)

		for _, testCase := range testCases {
			config.Config.Labels.Keep = testCase.keep
			config.Config.Labels.Strip = testCase.strip
			apiCache.Purge()
			req := httptest.NewRequest("POST", "/alerts.json", bytes.NewReader(payload))
			resp := httptest.NewRecorder()
			r.ServeHTTP(resp, req)
			if resp.Code != http.StatusOK {
				t.Errorf("POST /alerts.json returned status %d", resp.Code)
			}

			ur := models.AlertsResponse{}
			err := json.Unmarshal(resp.Body.Bytes(), &ur)
			if err != nil {
				t.Errorf("Failed to unmarshal response: %s", err)
			}

			for _, grid := range ur.Grids {
				for _, ag := range grid.AlertGroups {
					for _, alert := range ag.Alerts {
						verifyStrippedLabels(t, alert.Labels, testCase.keep, testCase.strip)
					}
					verifyStrippedLabels(t, ag.Labels, testCase.keep, testCase.strip)
					verifyStrippedLabels(t, ag.Shared.Labels, testCase.keep, testCase.strip)
				}
			}
		}
	}
}
