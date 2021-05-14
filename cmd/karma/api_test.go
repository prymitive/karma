package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
	"time"

	"github.com/Masterminds/semver/v3"
	"github.com/google/go-cmp/cmp"

	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/mock"
	"github.com/prymitive/karma/internal/models"
)

type groupTest struct {
	labels     map[string]string
	receiver   string
	alerts     []models.Alert
	id         string
	stateCount map[string]int
}

var groupTests = []groupTest{
	{
		receiver: "by-name",
		labels: map[string]string{
			"alertname": "Memory_Usage_Too_High",
		},
		alerts: []models.Alert{
			{
				StartsAt: time.Date(2019, time.January, 10, 0, 0, 0, 0, time.UTC),
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
		id: "099c5ca6d1c92f615b13056b935d0c8dee70f18c",
		stateCount: map[string]int{
			models.AlertStateActive:      1,
			models.AlertStateSuppressed:  0,
			models.AlertStateUnprocessed: 0,
		},
	},
	{
		receiver: "by-cluster-service",
		labels: map[string]string{
			"alertname": "Memory_Usage_Too_High",
			"cluster":   "prod",
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
				Labels: map[string]string{
					"instance": "server2",
					"job":      "node_exporter",
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
		},
		id: "0b1963665aac588dc4b18e17c7a4f70466c622ea",
		stateCount: map[string]int{
			models.AlertStateActive:      1,
			models.AlertStateSuppressed:  0,
			models.AlertStateUnprocessed: 0,
		},
	},
	{
		receiver: "by-cluster-service",
		labels: map[string]string{
			"alertname": "Host_Down",
			"cluster":   "staging",
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
				Labels: map[string]string{
					"instance": "server3",
					"ip":       "127.0.0.3",
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
				Labels: map[string]string{
					"instance": "server4",
					"ip":       "127.0.0.4",
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
				Labels: map[string]string{
					"instance": "server5",
					"ip":       "127.0.0.5",
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
		},
		id: "2d3f39413b41c873cb72e0b8065aa7b8631e983e",
		stateCount: map[string]int{
			models.AlertStateActive:      3,
			models.AlertStateSuppressed:  0,
			models.AlertStateUnprocessed: 0,
		},
	},
	{
		receiver: "by-cluster-service",
		labels: map[string]string{
			"alertname": "Host_Down",
			"cluster":   "dev",
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
				Labels: map[string]string{
					"instance": "server6",
					"ip":       "127.0.0.6",
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
				Labels: map[string]string{
					"instance": "server7",
					"ip":       "127.0.0.7",
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
				Labels: map[string]string{
					"instance": "server8",
					"ip":       "127.0.0.8",
				},
				State:    models.AlertStateSuppressed,
				Receiver: "by-cluster-service",
			},
		},
		id: "3c09c4156e6784dcf6d5b2e1629253798f82909b",
		stateCount: map[string]int{
			models.AlertStateActive:      0,
			models.AlertStateSuppressed:  3,
			models.AlertStateUnprocessed: 0,
		},
	},
	{
		receiver: "by-name",
		labels: map[string]string{
			"alertname": "Host_Down",
		},
		alerts: []models.Alert{
			{
				StartsAt: time.Date(2019, time.January, 1, 0, 0, 0, 0, time.UTC),
				Annotations: models.Annotations{
					models.Annotation{Visible: true, Name: "url", Value: "http://localhost/example.html", IsLink: true},
				},
				Labels: map[string]string{
					"cluster":  "prod",
					"instance": "server1",
					"ip":       "127.0.0.1",
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
				Labels: map[string]string{
					"cluster":  "prod",
					"instance": "server2",
					"ip":       "127.0.0.2",
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
				Labels: map[string]string{
					"cluster":  "staging",
					"instance": "server3",
					"ip":       "127.0.0.3",
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
				Labels: map[string]string{
					"cluster":  "staging",
					"instance": "server4",
					"ip":       "127.0.0.4",
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
				Labels: map[string]string{
					"cluster":  "staging",
					"instance": "server5",
					"ip":       "127.0.0.5",
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
				Labels: map[string]string{
					"cluster":  "dev",
					"instance": "server6",
					"ip":       "127.0.0.6",
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
				Labels: map[string]string{
					"cluster":  "dev",
					"instance": "server7",
					"ip":       "127.0.0.7",
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
				Labels: map[string]string{
					"cluster":  "dev",
					"instance": "server8",
					"ip":       "127.0.0.8",
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
		id: "58c6a3467cebc53abe68ecbe8643ce478c5a1573",
		stateCount: map[string]int{
			models.AlertStateActive:      5,
			models.AlertStateSuppressed:  3,
			models.AlertStateUnprocessed: 0,
		},
	},
	{
		receiver: "by-cluster-service",
		labels: map[string]string{
			"alertname": "Free_Disk_Space_Too_Low",
			"cluster":   "staging",
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
				Labels: map[string]string{
					"instance": "server5",
					"job":      "node_exporter",
					"disk":     "sda",
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
		},
		id: "8ca8151d9e30baba2334507dca53e16b7be93c5e",
		stateCount: map[string]int{
			models.AlertStateActive:      1,
			models.AlertStateSuppressed:  0,
			models.AlertStateUnprocessed: 0,
		},
	},
	{
		receiver: "by-cluster-service",
		labels: map[string]string{
			"alertname": "Host_Down",
			"cluster":   "prod",
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
				Labels: map[string]string{
					"instance": "server1",
					"ip":       "127.0.0.1",
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
				Labels: map[string]string{
					"instance": "server2",
					"ip":       "127.0.0.2",
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
		},
		id: "98c1a53d0f71af9c734c9180697383f3b8aff80f",
		stateCount: map[string]int{
			models.AlertStateActive:      2,
			models.AlertStateSuppressed:  0,
			models.AlertStateUnprocessed: 0,
		},
	},
	{
		receiver: "by-name",
		labels: map[string]string{
			"alertname": "HTTP_Probe_Failed",
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
				Labels: map[string]string{
					"instance": "web1",
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
				Labels: map[string]string{
					"instance": "web2",
				},
				State:    models.AlertStateActive,
				Receiver: "by-name",
			},
		},
		id: "bc4845fec77585cdfebe946234279d785ca93891",
		stateCount: map[string]int{
			models.AlertStateActive:      1,
			models.AlertStateSuppressed:  1,
			models.AlertStateUnprocessed: 0,
		},
	},
	{
		receiver: "by-name",
		labels: map[string]string{
			"alertname": "Free_Disk_Space_Too_Low",
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
				Labels: map[string]string{
					"cluster":  "staging",
					"instance": "server5",
					"job":      "node_exporter",
					"disk":     "sda",
				},
				State:    models.AlertStateActive,
				Receiver: "by-name",
			},
		},
		id: "bf78806d2a80b1c8150c1391669813722428e858",
		stateCount: map[string]int{
			models.AlertStateActive:      1,
			models.AlertStateSuppressed:  0,
			models.AlertStateUnprocessed: 0,
		},
	},
	{
		receiver: "by-cluster-service",
		labels: map[string]string{
			"alertname": "HTTP_Probe_Failed",
			"cluster":   "dev",
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
				Labels: map[string]string{
					"instance": "web1",
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
				Labels: map[string]string{
					"instance": "web2",
				},
				State:    models.AlertStateActive,
				Receiver: "by-cluster-service",
			},
		},
		id: "ecefc3705b1ab4e4c3283c879540be348d2d9dce",
		stateCount: map[string]int{
			models.AlertStateActive:      1,
			models.AlertStateSuppressed:  1,
			models.AlertStateUnprocessed: 0,
		},
	},
}

var countsMap = models.LabelNameStatsList{
	{
		Name: "@receiver",
		Hits: 24,
		Values: models.LabelValueStatsList{
			models.LabelValueStats{
				Value:   "by-cluster-service",
				Hits:    12,
				Percent: 50,
			},
			models.LabelValueStats{
				Value:   "by-name",
				Hits:    12,
				Percent: 50,
			},
		},
	},
	{
		Name: "@state",
		Hits: 24,
		Values: models.LabelValueStatsList{
			models.LabelValueStats{
				Value:   "active",
				Hits:    16,
				Percent: 67,
			},
			models.LabelValueStats{
				Value:   "suppressed",
				Hits:    8,
				Percent: 33,
			},
		},
	},
	{
		Name: "alertname",
		Hits: 24,
		Values: models.LabelValueStatsList{
			models.LabelValueStats{
				Value:   "Free_Disk_Space_Too_Low",
				Hits:    2,
				Percent: 8,
			},
			models.LabelValueStats{
				Value:   "HTTP_Probe_Failed",
				Hits:    4,
				Percent: 17,
			},
			models.LabelValueStats{
				Value:   "Host_Down",
				Hits:    16,
				Percent: 67,
			},
			models.LabelValueStats{
				Value:   "Memory_Usage_Too_High",
				Hits:    2,
				Percent: 8,
			},
		},
	},
	{
		Name: "cluster",
		Hits: 24,
		Values: models.LabelValueStatsList{
			models.LabelValueStats{
				Value:   "dev",
				Hits:    10,
				Percent: 42,
			},
			models.LabelValueStats{
				Value:   "prod",
				Hits:    6,
				Percent: 25,
			},
			models.LabelValueStats{
				Value:   "staging",
				Hits:    8,
				Percent: 33,
			},
		},
	},
	{
		Name: "disk",
		Hits: 2,
		Values: models.LabelValueStatsList{
			models.LabelValueStats{
				Value:   "sda",
				Hits:    2,
				Percent: 100,
			},
		},
	},
	{
		Name: "instance",
		Hits: 24,
		Values: models.LabelValueStatsList{
			models.LabelValueStats{
				Value:   "server1",
				Hits:    2,
				Percent: 9,
			},
			models.LabelValueStats{
				Value:   "server2",
				Hits:    4,
				Percent: 17,
			},
			models.LabelValueStats{
				Value:   "server3",
				Hits:    2,
				Percent: 9,
			},
			models.LabelValueStats{
				Value:   "server4",
				Hits:    2,
				Percent: 8,
			},
			models.LabelValueStats{
				Value:   "server5",
				Hits:    4,
				Percent: 17,
			},
			models.LabelValueStats{
				Value:   "server6",
				Hits:    2,
				Percent: 8,
			},
			models.LabelValueStats{
				Value:   "server7",
				Hits:    2,
				Percent: 8,
			},
			models.LabelValueStats{
				Value:   "server8",
				Hits:    2,
				Percent: 8,
			},
			models.LabelValueStats{
				Value:   "web1",
				Hits:    2,
				Percent: 8,
			},
			models.LabelValueStats{
				Value:   "web2",
				Hits:    2,
				Percent: 8,
			},
		},
	},
	{
		Name: "ip",
		Hits: 16,
		Values: models.LabelValueStatsList{
			models.LabelValueStats{
				Value:   "127.0.0.1",
				Hits:    2,
				Percent: 13,
			},
			models.LabelValueStats{
				Value:   "127.0.0.2",
				Hits:    2,
				Percent: 13,
			},
			models.LabelValueStats{
				Value:   "127.0.0.3",
				Hits:    2,
				Percent: 13,
			},
			models.LabelValueStats{
				Value:   "127.0.0.4",
				Hits:    2,
				Percent: 13,
			},
			models.LabelValueStats{
				Value:   "127.0.0.5",
				Hits:    2,
				Percent: 12,
			},
			models.LabelValueStats{
				Value:   "127.0.0.6",
				Hits:    2,
				Percent: 12,
			},
			models.LabelValueStats{
				Value:   "127.0.0.7",
				Hits:    2,
				Percent: 12,
			},
			models.LabelValueStats{
				Value:   "127.0.0.8",
				Hits:    2,
				Percent: 12,
			},
		},
	},
	{
		Name: "job",
		Hits: 24,
		Values: models.LabelValueStatsList{
			models.LabelValueStats{
				Value:   "node_exporter",
				Hits:    8,
				Percent: 33,
			},
			models.LabelValueStats{
				Value:   "node_ping",
				Hits:    16,
				Percent: 67,
			},
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
	mockConfig()
	for _, version := range mock.ListAllMocks() {
		t.Logf("Testing API using mock files from Alertmanager %s", version)
		mockAlerts(version)
		apiCache.Purge()
		r := testRouter()
		setupRouter(r, nil)
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
			t.Errorf("[%s] Alertmanager cluster 'default' (default) missing from silences", version)
		} else if len(am) == 0 {
			t.Errorf("[%s] Silences mismatch, expected >0 but got %d", version, len(am))
		}

		for _, nameStats := range ur.Counters {
			var totalPercent int
			for _, valueStats := range nameStats.Values {
				totalPercent += valueStats.Percent
			}
			if totalPercent != 100 {
				t.Errorf("[%s] Counters %s sum is != 100: %d", version, nameStats.Name, totalPercent)
			}
		}

		for _, expectedNameStats := range countsMap {
			var foundName bool
			for _, nameStats := range ur.Counters {
				if nameStats.Name == expectedNameStats.Name {
					if nameStats.Hits != expectedNameStats.Hits {
						t.Errorf("[%s] Counters mismatch for '%s', expected %v hits but got %v",
							version, nameStats.Name, expectedNameStats.Hits, nameStats.Hits)
					}
					for _, expectedValueStats := range expectedNameStats.Values {
						var foundValue bool
						for _, valueStats := range nameStats.Values {
							if valueStats.Value == expectedValueStats.Value {
								if valueStats.Hits != expectedValueStats.Hits {
									t.Errorf("[%s] Counters mismatch for '%s: %s', expected %v hits but got %v",
										version, nameStats.Name, valueStats.Value, expectedValueStats.Hits, valueStats.Hits)
								}
								if valueStats.Percent != expectedValueStats.Percent {
									t.Errorf("[%s] Percent mismatch for '%s: %s', expected %v%% but got %v%%",
										version, nameStats.Name, valueStats.Value, expectedValueStats.Percent, valueStats.Percent)
								}
								foundValue = true
								break
							}
						}
						if !foundValue {
							if !foundName {
								t.Errorf("[%s] Counters missing for label '%s: %s'", version, expectedNameStats.Name, expectedValueStats.Value)
							}
						}
					}
					foundName = true
					break
				}
			}
			if !foundName {
				t.Errorf("[%s] Counters missing for label '%s'", version, expectedNameStats.Name)
			}
		}
		if !reflect.DeepEqual(ur.Filters, filtersExpected) {
			t.Errorf("[%s] Filters mismatch, expected %v but got %v", version, filtersExpected, ur.Filters)
		}

		expectedReceivers := []string{"by-cluster-service", "by-name"}
		if diff := cmp.Diff(expectedReceivers, ur.Receivers); diff != "" {
			t.Errorf("Incorrect receivers list (-want +got):\n%s", diff)
		}
	}
}

type sortTest struct {
	defaultSortReverse bool
	filter             string
	sortOrder          string
	sortLabel          string
	sortReverse        string
	expectedLabel      string
	expectedValues     []string
}

var sortTests = []sortTest{
	{
		filter:         "q=@receiver=by-cluster-service",
		sortOrder:      "label",
		sortLabel:      "cluster",
		sortReverse:    "0",
		expectedLabel:  "cluster",
		expectedValues: []string{"dev", "dev", "prod", "prod", "staging", "staging"},
	},
	{
		filter:         "q=@receiver=by-cluster-service",
		sortOrder:      "label",
		sortLabel:      "cluster",
		sortReverse:    "1",
		expectedLabel:  "cluster",
		expectedValues: []string{"staging", "staging", "prod", "prod", "dev", "dev"},
	},
	{
		filter:         "q=cluster=dev",
		sortOrder:      "label",
		sortLabel:      "cluster",
		sortReverse:    "0",
		expectedLabel:  "cluster",
		expectedValues: []string{"dev", "dev", "dev", "dev"},
	},
	{
		filter:         "q=@receiver=by-cluster-service",
		sortOrder:      "label",
		sortLabel:      "disk",
		sortReverse:    "0",
		expectedLabel:  "disk",
		expectedValues: []string{"sda", "", "", "", "", "", "", "", "", "", "", ""},
	},
	{
		filter:         "q=@receiver=by-cluster-service",
		sortOrder:      "label",
		sortLabel:      "disk",
		sortReverse:    "1",
		expectedLabel:  "disk",
		expectedValues: []string{"", "", "", "", "", "", "", "", "", "", "", "sda"},
	},
	{
		filter:         "q=@receiver=by-cluster-service",
		sortOrder:      "disabled",
		sortLabel:      "",
		sortReverse:    "0",
		expectedLabel:  "cluster",
		expectedValues: []string{"dev", "prod", "staging", "dev", "staging", "prod"},
	},
	{
		filter:         "q=@receiver=by-cluster-service",
		sortOrder:      "disabled",
		sortLabel:      "",
		sortReverse:    "1",
		expectedLabel:  "cluster",
		expectedValues: []string{"prod", "staging", "dev", "staging", "prod", "dev"},
	},
	{
		filter:         "q=@receiver=by-cluster-service",
		sortOrder:      "",
		sortLabel:      "",
		sortReverse:    "0",
		expectedLabel:  "cluster",
		expectedValues: []string{"dev", "dev", "prod", "prod", "staging", "staging"},
	},
	{
		filter:         "q=@receiver=by-cluster-service",
		sortOrder:      "",
		sortLabel:      "",
		sortReverse:    "1",
		expectedLabel:  "cluster",
		expectedValues: []string{"staging", "staging", "prod", "prod", "dev", "dev"},
	},
	{
		filter:         "q=@receiver=by-cluster-service",
		sortOrder:      "label",
		sortLabel:      "job",
		sortReverse:    "0",
		expectedLabel:  "job",
		expectedValues: []string{"node_exporter", "node_exporter", "node_exporter", "node_ping", "node_ping", "node_ping"},
	},
	{
		filter:         "q=@receiver=by-cluster-service",
		sortOrder:      "label",
		sortLabel:      "job",
		sortReverse:    "1",
		expectedLabel:  "job",
		expectedValues: []string{"node_ping", "node_ping", "node_ping", "node_exporter", "node_exporter", "node_exporter"},
	},
	{
		defaultSortReverse: true,
		filter:             "q=@receiver=by-cluster-service",
		sortOrder:          "label",
		sortLabel:          "job",
		sortReverse:        "a",
		expectedLabel:      "job",
		expectedValues:     []string{"node_ping", "node_ping", "node_ping", "node_exporter", "node_exporter", "node_exporter"},
	},
	{
		defaultSortReverse: false,
		filter:             "q=@receiver=by-cluster-service",
		sortOrder:          "label",
		sortLabel:          "job",
		sortReverse:        "2",
		expectedLabel:      "job",
		expectedValues:     []string{"node_exporter", "node_exporter", "node_exporter", "node_ping", "node_ping", "node_ping"},
	},
	{
		defaultSortReverse: false,
		filter:             "q=@alertmanager!=default",
		sortOrder:          "label",
		sortLabel:          "job",
		sortReverse:        "2",
		expectedLabel:      "job",
		expectedValues:     []string{},
	},
}

func TestSortOrder(t *testing.T) {
	mockConfig()
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
				uri := fmt.Sprintf(
					"/alerts.json?sortOrder=%s&sortLabel=%s&sortReverse=%s&%s",
					testCase.sortOrder,
					testCase.sortLabel,
					testCase.sortReverse,
					testCase.filter,
				)
				t.Logf("Request URI: %s", uri)
				req := httptest.NewRequest("GET", uri, nil)
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

				if len(ur.Grids) == 0 {
					if len(testCase.expectedValues) > 0 {
						t.Errorf("Got empty grids but expected %d groups", len(testCase.expectedValues))
					}
				} else {
					values := []string{}
					for _, ag := range ur.Grids[0].AlertGroups {
						v := ag.Labels[testCase.expectedLabel]
						if v == "" {
							v = ag.Shared.Labels[testCase.expectedLabel]
						}
						if v != "" {
							values = append(values, v)
						} else {
							for _, alert := range ag.Alerts {
								v = alert.Labels[testCase.expectedLabel]
								values = append(values, v)
							}
						}
					}

					if diff := cmp.Diff(testCase.expectedValues, values); diff != "" {
						t.Errorf("Incorrectly sorted values (-want +got):\n%s", diff)
					}
				}
			}
		}
	}
}

func verifyStrippedLabels(t *testing.T, labels map[string]string, keep, strip []string) {
	for _, l := range strip {
		if val, ok := labels[l]; ok {
			t.Errorf("Found stripped label %s=%s on %v", l, val, labels)
		}
	}
	if len(keep) > 0 && len(strip) == 0 {
		for k, v := range labels {
			ok := false
			for _, l := range keep {
				if k == l {
					ok = true
				}
			}
			if !ok {
				t.Errorf("Found label %s=%s that's not on the keep list: %v", k, v, keep)
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

	mockConfig()
	for _, version := range mock.ListAllMocks() {
		t.Logf("Testing API using mock files from Alertmanager %s", version)
		mockAlerts(version)
		r := testRouter()
		setupRouter(r, nil)

		for _, testCase := range testCases {
			config.Config.Labels.Keep = testCase.keep
			config.Config.Labels.Strip = testCase.strip
			apiCache.Purge()
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
