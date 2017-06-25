package models_test

import (
	"testing"

	"github.com/cloudflare/unsee/models"
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
