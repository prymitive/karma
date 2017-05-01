package alertmanager_test

import (
	"strings"
	"testing"

	"github.com/cloudflare/unsee/alertmanager"
	"github.com/cloudflare/unsee/config"
	"github.com/cloudflare/unsee/mock"

	log "github.com/Sirupsen/logrus"
	httpmock "gopkg.in/jarcoal/httpmock.v1"
)

var testVersions = []string{"0.4", "0.5", "0.6.1"}

func TestGetAlerts(t *testing.T) {
	log.SetLevel(log.ErrorLevel)
	config.Config.AlertmanagerURI = "http://localhost"

	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	for _, version := range testVersions {
		httpmock.Reset()
		mock.RegisterURL("http://localhost/api/v1/status", version, "status")
		mock.RegisterURL("http://localhost/api/v1/alerts/groups", version, "alerts/groups")

		v := alertmanager.GetVersion()
		if !strings.HasPrefix(v, version) {
			t.Errorf("GetVersion() returned '%s', expected '%s'", v, version)
		}

		groups, err := alertmanager.GetAlerts(v)
		if err != nil {
			t.Errorf("GetAlerts(%s) failed: %s", version, err.Error())
		}
		if len(groups) != 4 {
			t.Errorf("Got %d groups, expected %d", len(groups), 4)
		}
	}
}

func TestGetSilences(t *testing.T) {
	log.SetLevel(log.ErrorLevel)
	config.Config.AlertmanagerURI = "http://localhost"

	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	for _, version := range testVersions {
		httpmock.Reset()
		mock.RegisterURL("http://localhost/api/v1/status", version, "status")
		mock.RegisterURL("http://localhost/api/v1/silences", version, "silences")

		v := alertmanager.GetVersion()
		if !strings.HasPrefix(v, version) {
			t.Errorf("GetVersion() returned '%s', expected '%s'", v, version)
		}

		silences, err := alertmanager.GetSilences(v)
		if err != nil {
			t.Errorf("GetSilences(%s) failed: %s", version, err.Error())
		}
		if len(silences) != 2 {
			t.Errorf("Got %d silences, expected %d", len(silences), 2)
		}
	}
}
