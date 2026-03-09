package models_test

import (
	"slices"
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
		alert: models.Alert{
			Receiver: models.NewUniqueString("default"),
			State:    models.AlertStateActive,
			StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 5, time.UTC),
		},
		position: 0,
	},
	{
		alert: models.Alert{
			Receiver: models.NewUniqueString("default"),
			State:    models.AlertStateActive,
			StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 1, time.UTC),
		},
		position: 1,
	},
	{
		alert: models.Alert{
			Receiver: models.NewUniqueString("default"),
			State:    models.AlertStateActive,
			StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 0, time.UTC),
		},
		position: 2,
	},
	{
		alert: models.Alert{
			Receiver: models.NewUniqueString("default"),
			State:    models.AlertStateActive,
			StartsAt: time.Date(2015, time.March, 10, 0, 0, 0, 0, time.UTC),
		},
		position: 6,
	},
	{
		alert: models.Alert{
			Receiver: models.NewUniqueString("default"),
			State:    models.AlertStateActive,
			StartsAt: time.Date(2016, time.December, 10, 0, 0, 0, 0, time.UTC),
		},
		position: 4,
	},
	{
		alert: models.Alert{
			Receiver: models.NewUniqueString("default"),
			State:    models.AlertStateActive, StartsAt: time.Date(2017, time.January, 10, 0, 0, 0, 0, time.UTC),
		},

		position: 3,
	},
	{
		alert: models.Alert{
			Receiver: models.NewUniqueString("default"),
			State:    models.AlertStateActive,
			StartsAt: time.Date(2015, time.March, 10, 0, 0, 0, 0, time.UTC),
		},
		position: 5,
	},
}

func TestAlertListSort(t *testing.T) {
	al := make(models.AlertList, 0, len(alertListSortTests))
	for _, testCase := range alertListSortTests {
		testCase.alert.UpdateFingerprints()
		al = append(al, testCase.alert)
	}

	// repeat sort 100 times to ensure we're always sorting same way
	iterations := 100
	failures := 0
	for i := 1; i <= iterations; i++ {
		slices.SortFunc(al, models.CompareAlerts)
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
	name     string
	ag       models.AlertGroup
	fpChange bool
}

var agFPTests = []agFPTest{
	{
		name: "empty group fingerprint",
		ag: models.AlertGroup{
			Receiver: models.NewUniqueString("default"),
		},
	},
	{
		name: "different Receiver shouldn't change content fingerprint",
		ag: models.AlertGroup{
			Receiver: models.NewUniqueString("default"),
		},
		fpChange: false,
	},
	{
		name: "different StateCount shouldn't change content fingerprint",
		ag: models.AlertGroup{
			Receiver:   models.NewUniqueString("default"),
			StateCount: map[string]int{"default": 0},
		},
		fpChange: false,
	},
	{
		name: "different Labels shouldn't change content fingerprint",
		ag: models.AlertGroup{
			Receiver: models.NewUniqueString("default"),
			Labels: models.Labels{
				{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
			},
			StateCount: map[string]int{"default": 0},
		},
		fpChange: false,
	},
	{
		name: "different set of alerts should change content fingerprint",
		ag: models.AlertGroup{
			Receiver: models.NewUniqueString("default"),
			Labels:   models.Labels{{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")}},
			Alerts: models.AlertList{
				models.Alert{
					Receiver: models.NewUniqueString("default"),
					State:    models.AlertStateActive,
					Labels: models.Labels{
						{Name: models.NewUniqueString("foo1"), Value: models.NewUniqueString("bar")},
					},
				},
			},
			StateCount: map[string]int{"default": 0},
		},
		fpChange: true,
	},
	{
		name: "another different set of alerts should change content fingerprint",
		ag: models.AlertGroup{
			Receiver: models.NewUniqueString("default"),
			Labels:   models.Labels{{Name: models.NewUniqueString("bar"), Value: models.NewUniqueString("foo")}},
			Alerts: models.AlertList{
				models.Alert{
					Receiver: models.NewUniqueString("default"),
					State:    models.AlertStateActive,
					Labels: models.Labels{
						{Name: models.NewUniqueString("bar"), Value: models.NewUniqueString("foo")},
					},
				},
			},
			StateCount: map[string]int{"default": 0},
		},
		fpChange: true,
	},
	{
		name: "repeating last set of alerts shouldn't change content fingerprint",
		ag: models.AlertGroup{
			Receiver: models.NewUniqueString("default"),
			Labels: models.Labels{
				{Name: models.NewUniqueString("bar"), Value: models.NewUniqueString("foo")},
			},
			Alerts: models.AlertList{
				models.Alert{
					Receiver: models.NewUniqueString("default"),
					State:    models.AlertStateActive,
					Labels: models.Labels{
						{Name: models.NewUniqueString("bar"), Value: models.NewUniqueString("foo")},
					},
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
		t.Run(testCase.name, func(t *testing.T) {
			alerts := models.AlertList{}
			for _, alert := range testCase.ag.Alerts {
				alert.UpdateFingerprints()
				alerts = append(alerts, alert)
			}
			slices.SortFunc(alerts, models.CompareAlerts)
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
	ag := models.AlertGroup{
		Receiver: models.NewUniqueString("default"),
	}
	if ag.LabelsFingerprint() == ag.ContentFingerprint() {
		t.Errorf("Expected LabelsFingerprint and ContentFingerprint to return different values")
	}
}

func TestLabelsFingerprint(t *testing.T) {
	// verifies that LabelsFingerprint produces non-empty output when labels are present
	ag := models.AlertGroup{
		Receiver: models.NewUniqueString("default"),
		Labels: models.Labels{
			{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
			{Name: models.NewUniqueString("baz"), Value: models.NewUniqueString("qux")},
		},
	}
	fp := ag.LabelsFingerprint()
	if fp == "" {
		t.Error("LabelsFingerprint() returned empty string for group with labels")
	}

	// verifies that different labels produce a different fingerprint
	ag2 := models.AlertGroup{
		Receiver: models.NewUniqueString("default"),
		Labels: models.Labels{
			{Name: models.NewUniqueString("different"), Value: models.NewUniqueString("label")},
		},
	}
	fp2 := ag2.LabelsFingerprint()
	if fp == fp2 {
		t.Errorf("LabelsFingerprint() should differ for groups with different labels, both returned %q", fp)
	}

	// verifies that same receiver and labels produce the same fingerprint
	ag3 := models.AlertGroup{
		Receiver: models.NewUniqueString("default"),
		Labels: models.Labels{
			{Name: models.NewUniqueString("foo"), Value: models.NewUniqueString("bar")},
			{Name: models.NewUniqueString("baz"), Value: models.NewUniqueString("qux")},
		},
	}
	if ag3.LabelsFingerprint() != fp {
		t.Errorf("LabelsFingerprint() not stable: %q != %q", ag3.LabelsFingerprint(), fp)
	}
}

type findLatestStartsAtTest struct {
	expectedStartsAt time.Time
	alerts           []models.Alert
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
