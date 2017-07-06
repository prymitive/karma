package models_test

import (
	"sort"
	"testing"
	"time"

	"github.com/cloudflare/unsee/models"
)

type alertListSortTest struct {
	alert    models.Alert
	position int
}

var alertListSortTests = []alertListSortTest{
	alertListSortTest{
		alert:    models.Alert{StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 5, time.UTC)},
		position: 0,
	},
	alertListSortTest{
		alert:    models.Alert{StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 1, time.UTC)},
		position: 1,
	},
	alertListSortTest{
		alert:    models.Alert{StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 0, time.UTC)},
		position: 2,
	},
	alertListSortTest{
		alert:    models.Alert{StartsAt: time.Date(2015, time.March, 10, 0, 0, 0, 0, time.UTC)},
		position: 6,
	},
	alertListSortTest{
		alert:    models.Alert{StartsAt: time.Date(2016, time.December, 10, 0, 0, 0, 0, time.UTC)},
		position: 4,
	},
	alertListSortTest{
		alert:    models.Alert{StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 0, time.UTC)},
		position: 3,
	},
	alertListSortTest{
		alert:    models.Alert{StartsAt: time.Date(2015, time.March, 10, 0, 0, 0, 0, time.UTC)},
		position: 5,
	},
}

func TestUnseeAlertListSort(t *testing.T) {
	al := models.AlertList{}
	for _, testCase := range alertListSortTests {
		testCase.alert.UpdateFingerprints()
		al = append(al, testCase.alert)
	}

	// repeat sort 100 times to ensure we're always sorting same way
	iterations := 100
	failures := 0
	for i := 1; i <= iterations; i++ {
		sort.Sort(al)
		for _, testCase := range alertListSortTests {
			testCase.alert.UpdateFingerprints()
			if al[testCase.position].ContentFingerprint() != testCase.alert.ContentFingerprint() {
				failures++
			}
		}
	}
	if failures > 0 {
		t.Errorf("%d sort failures for %d checks", failures, iterations*len(al))
	}
}

type agFPTest struct {
	ag          models.AlertGroup
	fingerprint string
}

var agFPTests = []agFPTest{
	// empty group fingerprint
	agFPTest{
		ag:          models.AlertGroup{},
		fingerprint: "da39a3ee5e6b4b0d3255bfef95601890afd80709",
	},
	// different Receiver shouldn't change content fingerprint
	agFPTest{
		ag: models.AlertGroup{
			Receiver: "default",
		},
		fingerprint: "da39a3ee5e6b4b0d3255bfef95601890afd80709",
	},
	// different StateCount shouldn't change content fingerprint
	agFPTest{
		ag: models.AlertGroup{
			Receiver:   "default",
			StateCount: map[string]int{"default": 0},
		},
		fingerprint: "da39a3ee5e6b4b0d3255bfef95601890afd80709",
	},
	// different Labels shouldn't change content fingerprint
	agFPTest{
		ag: models.AlertGroup{
			Receiver:   "default",
			Labels:     map[string]string{"foo": "bar"},
			StateCount: map[string]int{"default": 0},
		},
		fingerprint: "da39a3ee5e6b4b0d3255bfef95601890afd80709",
	},
	// different set of alerts should change content fingerprint
	agFPTest{
		ag: models.AlertGroup{
			Receiver: "default",
			Labels:   map[string]string{"foo": "bar"},
			Alerts: models.AlertList{
				models.Alert{
					Labels: map[string]string{"foo1": "bar"},
					State:  models.AlertStateActive,
				},
			},
			StateCount: map[string]int{"default": 0},
		},
		fingerprint: "87e79b3d507d26f21bc5e82b8db19f87ce46c1ad",
	},
}

func TestAlertGroupContentFingerprint(t *testing.T) {
	for _, testCase := range agFPTests {
		alerts := models.AlertList{}
		for _, alert := range testCase.ag.Alerts {
			alert.UpdateFingerprints()
			alerts = append(alerts, alert)
		}
		sort.Sort(alerts)
		testCase.ag.Alerts = alerts
		if testCase.ag.ContentFingerprint() != testCase.fingerprint {
			t.Errorf("Invalid AlertGroup ContentFingerprint(), expected '%s', got '%s', AlertGroup: %v",
				testCase.fingerprint, testCase.ag.ContentFingerprint(), testCase.ag)
		}
	}
}
