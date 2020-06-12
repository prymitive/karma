package models_test

import (
	"sort"
	"testing"
	"time"

	"github.com/prymitive/karma/internal/models"
)

type alertListSortTest struct {
	alert    models.Alert
	position int
}

var alertListSortTests = []alertListSortTest{
	{
		alert:    models.Alert{StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 5, time.UTC)},
		position: 0,
	},
	{
		alert:    models.Alert{StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 1, time.UTC)},
		position: 1,
	},
	{
		alert:    models.Alert{StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 0, time.UTC)},
		position: 2,
	},
	{
		alert:    models.Alert{StartsAt: time.Date(2015, time.March, 10, 0, 0, 0, 0, time.UTC)},
		position: 6,
	},
	{
		alert:    models.Alert{StartsAt: time.Date(2016, time.December, 10, 0, 0, 0, 0, time.UTC)},
		position: 4,
	},
	{
		alert:    models.Alert{StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 0, time.UTC)},
		position: 3,
	},
	{
		alert:    models.Alert{StartsAt: time.Date(2015, time.March, 10, 0, 0, 0, 0, time.UTC)},
		position: 5,
	},
}

func TestAlertListSort(t *testing.T) {
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
	name     string            // name of the test
	ag       models.AlertGroup // alert group data
	fpChange bool              // true if fingerprint should change vs previous run
}

var agFPTests = []agFPTest{
	{
		name: "empty group fingerprint",
		ag:   models.AlertGroup{},
	},
	{
		name: "different Receiver shouldn't change content fingerprint",
		ag: models.AlertGroup{
			Receiver: "default",
		},
		fpChange: false,
	},
	{
		name: "different StateCount shouldn't change content fingerprint",
		ag: models.AlertGroup{
			Receiver:   "default",
			StateCount: map[string]int{"default": 0},
		},
		fpChange: false,
	},
	{
		name: "different Labels shouldn't change content fingerprint",
		ag: models.AlertGroup{
			Receiver:   "default",
			Labels:     map[string]string{"foo": "bar"},
			StateCount: map[string]int{"default": 0},
		},
		fpChange: false,
	},
	{
		name: "different set of alerts should change content fingerprint",
		ag: models.AlertGroup{
			Receiver: "default",
			Labels:   map[string]string{"foo": "bar"},
			Alerts: models.AlertList{
				models.Alert{
					Labels: map[string]string{"foo1": "bar"},
				},
			},
			StateCount: map[string]int{"default": 0},
		},
		fpChange: true,
	},
	{
		name: "another different set of alerts should change content fingerprint",
		ag: models.AlertGroup{
			Receiver: "default",
			Labels:   map[string]string{"bar": "foo"},
			Alerts: models.AlertList{
				models.Alert{
					Labels: map[string]string{"bar": "foo"},
				},
			},
			StateCount: map[string]int{"default": 0},
		},
		fpChange: true,
	},
	{
		name: "repeating last set of alerts shouldn't change content fingerprint",
		ag: models.AlertGroup{
			Receiver: "default",
			Labels:   map[string]string{"bar": "foo"},
			Alerts: models.AlertList{
				models.Alert{
					Labels: map[string]string{"bar": "foo"},
				},
			},
			StateCount: map[string]int{"default": 0},
		},
		fpChange: false,
	},
}

func TestAlertGroupContentFingerprint(t *testing.T) {
	fps := []string{}
	for i, testCase := range agFPTests {
		i := i               // scopelint pin
		testCase := testCase // scopelint pin
		t.Run(testCase.name, func(t *testing.T) {
			alerts := models.AlertList{}
			for _, alert := range testCase.ag.Alerts {
				alert := alert // scopelint pin
				alert.UpdateFingerprints()
				alerts = append(alerts, alert)
			}
			sort.Sort(alerts)
			testCase.ag.Alerts = alerts
			// get alert group fingerprint
			fp := testCase.ag.ContentFingerprint()
			// add it to the list
			fps = append(fps, fp)
			// skip first test case since there's nothing to compare it with
			if i > 0 {
				// check if current test case generated fingerprint that is different
				// from the previous one
				fpChange := fp != fps[i-1]
				// check if we expected a change or not
				if fpChange != testCase.fpChange {
					t.Errorf("Fingerprint changed=%t while expected change=%t, alertgroup: %v",
						fpChange, testCase.fpChange, testCase.ag)
				}
			}
		})
	}
}

func TestFingerprint(t *testing.T) {
	ag := models.AlertGroup{}
	if ag.LabelsFingerprint() == ag.ContentFingerprint() {
		t.Errorf("Expected LabelsFingerprint and ContentFingerprint to return different values")
	}
}

type findLatestStartsAtTest struct {
	alerts           []models.Alert
	expectedStartsAt time.Time
}

var findLatestStartsAtTests = []findLatestStartsAtTest{
	{
		alerts: []models.Alert{
			{StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 5, time.UTC)},
			{StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 1, time.UTC)},
			{StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 8, time.UTC)},
		},
		expectedStartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 8, time.UTC),
	},
	{
		alerts: []models.Alert{
			{StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 8, time.UTC)},
			{StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 2, time.UTC)},
			{StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 1, time.UTC)},
		},
		expectedStartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 8, time.UTC),
	},
	{
		alerts: []models.Alert{
			{StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 1, time.UTC)},
			{StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 1, time.UTC)},
			{StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 1, time.UTC)},
		},
		expectedStartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 1, time.UTC),
	},
	{
		alerts: []models.Alert{
			{StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 5, time.UTC)},
			{StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 8, time.UTC)},
			{StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 1, time.UTC)},
		},
		expectedStartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 8, time.UTC),
	},
}

func TestFindLatestStartsAt(t *testing.T) {
	for _, testCase := range findLatestStartsAtTests {
		ag := models.AlertGroup{Alerts: testCase.alerts}
		got := ag.FindLatestStartsAt()
		if !got.Equal(testCase.expectedStartsAt) {
			t.Errorf("FindLatestStartsAt returned %s when %s was expected", got, testCase.expectedStartsAt)
		}
	}
}
