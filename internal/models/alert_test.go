package models_test

import (
	"testing"
	"time"

	"github.com/cloudflare/unsee/internal/models"
)

type alertStateTest struct {
	alert       models.Alert
	isSilenced  bool
	isInhibited bool
	isActive    bool
}

var alertStateTests = []alertStateTest{
	alertStateTest{
		alert: models.Alert{
			State: models.AlertStateActive,
		},
		isActive: true,
	},
	alertStateTest{
		alert: models.Alert{
			State:       models.AlertStateSuppressed,
			InhibitedBy: []string{"1234"},
		},
		isInhibited: true,
	},
	alertStateTest{
		alert: models.Alert{
			State:      models.AlertStateSuppressed,
			SilencedBy: []string{"1234"},
		},
		isSilenced: true,
	},
}

func TestAlertState(t *testing.T) {
	for _, testCase := range alertStateTests {
		if testCase.alert.IsActive() != testCase.isActive {
			t.Errorf("alert.IsActive() returned %t while %t was expected for alert %v",
				testCase.alert.IsActive(), testCase.isActive, testCase.alert)
		}
		if testCase.alert.IsInhibited() != testCase.isInhibited {
			t.Errorf("alert.IsInhibited() returned %t while %t was expected for alert %v",
				testCase.alert.IsInhibited(), testCase.isInhibited, testCase.alert)
		}
		if testCase.alert.IsSilenced() != testCase.isSilenced {
			t.Errorf("alert.IsSilenced() returned %t while %t was expected for alert %v",
				testCase.alert.IsSilenced(), testCase.isSilenced, testCase.alert)
		}
	}
}

func BenchmarkLabelsFingerprint(b *testing.B) {
	alert := models.Alert{
		Labels: map[string]string{
			"foo1":        "bar1",
			"foo1bar1":    "545jjjssd",
			"foo1xxxx":    "bdjjs88ff",
			"agdfdfd":     "bar1",
			"fossdsf3o1":  "bar11111",
			"fdfdgfdgoo1": "bar1",
		},
	}
	for n := 0; n < b.N; n++ {
		alert.LabelsFingerprint()
	}
}

func BenchmarkLabelsContent(b *testing.B) {
	alert := models.Alert{
		Annotations: models.Annotations{
			models.Annotation{
				Name:    "foo",
				Value:   "bar",
				Visible: true,
			},
			models.Annotation{
				Name:    "abc",
				Value:   "Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit...",
				Visible: true,
			},
		},
		Labels: map[string]string{
			"foo1":        "bar1",
			"foo1bar1":    "545jjjssd",
			"foo1xxxx":    "bdjjs88ff",
			"agdfdfd":     "bar1",
			"fossdsf3o1":  "bar11111",
			"fdfdgfdgoo1": "bar1",
		},
		State:    models.AlertStateActive,
		StartsAt: time.Date(2015, time.March, 10, 0, 0, 0, 0, time.UTC),
		Alertmanager: []models.AlertmanagerInstance{
			models.AlertmanagerInstance{
				Name:  "default",
				URI:   "http://localhost",
				State: models.AlertStateActive,
			},
		},
	}
	alert.UpdateFingerprints()
	for n := 0; n < b.N; n++ {
		alert.LabelsFingerprint()
	}
}
