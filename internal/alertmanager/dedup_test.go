package alertmanager_test

import (
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/cloudflare/unsee/internal/alertmanager"
	"github.com/cloudflare/unsee/internal/config"
	"github.com/cloudflare/unsee/internal/mock"

	log "github.com/sirupsen/logrus"
)

func init() {
	log.SetLevel(log.ErrorLevel)
	for i, uri := range mock.ListAllMockURIs() {
		alertmanager.NewAlertmanager(fmt.Sprintf("dedup-mock-%d", i), uri, time.Second)
	}
}

func pullAlerts() error {
	for _, am := range alertmanager.GetAlertmanagers() {
		err := am.Pull()
		if err != nil {
			return err
		}
	}
	return nil
}

func TestDedupAlerts(t *testing.T) {
	if err := pullAlerts(); err != nil {
		t.Error(err)
	}
	alertGroups := alertmanager.DedupAlerts()

	if len(alertGroups) != 10 {
		t.Errorf("Expected %d alert groups, got %d", 10, len(alertGroups))
	}

	totalAlerts := 0
	for _, ag := range alertGroups {
		totalAlerts += len(ag.Alerts)
	}
	if totalAlerts != 24 {
		t.Errorf("Expected %d total alerts, got %d", 24, totalAlerts)
	}
}

func TestDedupAlertsWithoutLabels(t *testing.T) {
	config.Config.KeepLabels = []string{"xyz"}
	if err := pullAlerts(); err != nil {
		t.Error(err)
	}
	alertGroups := alertmanager.DedupAlerts()
	config.Config.KeepLabels = []string{}

	if len(alertGroups) != 10 {
		t.Errorf("Expected %d alert groups, got %d", 10, len(alertGroups))
	}

	totalAlerts := 0
	for _, ag := range alertGroups {
		totalAlerts += len(ag.Alerts)
	}
	if totalAlerts != 24 {
		t.Errorf("Expected %d total alerts, got %d", 24, totalAlerts)
	}
}

func TestDedupAutocomplete(t *testing.T) {
	if err := pullAlerts(); err != nil {
		t.Error(err)
	}
	ac := alertmanager.DedupAutocomplete()
	// since we have alertmanager instance per mock adding new mocks will increase
	// the number of hints, so we need to calculate the expected value here
	// there should be 56 hints excluding @alertmanager ones, use that as our base
	// and add 2 hints per alertmanager instance (= and != hints)
	mockCount := len(mock.ListAllMockURIs())
	expected := 56 + mockCount*2
	if len(ac) != expected {
		t.Errorf("Expected %d autocomplete hints, got %d", expected, len(ac))
	}
}

func TestDedupColors(t *testing.T) {
	os.Setenv("COLOR_LABELS_UNIQUE", "cluster instance @receiver")
	os.Setenv("ALERTMANAGER_URIS", "default:http://localhost")
	config.Config.Read()
	if err := pullAlerts(); err != nil {
		t.Error(err)
	}
	colors := alertmanager.DedupColors()
	expected := 3
	if len(colors) != expected {
		t.Errorf("Expected %d color keys, got %d", expected, len(colors))
	}
}
