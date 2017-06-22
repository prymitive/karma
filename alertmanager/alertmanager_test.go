package alertmanager_test

import (
	"testing"

	"github.com/cloudflare/unsee/alertmanager"
	"github.com/cloudflare/unsee/config"
	"github.com/cloudflare/unsee/mock"

	log "github.com/Sirupsen/logrus"
	httpmock "gopkg.in/jarcoal/httpmock.v1"
)

func TestGetAlerts(t *testing.T) {
	log.SetLevel(log.ErrorLevel)
	config.Config.AlertmanagerURI = "http://localhost"

	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	for _, version := range mock.ListAllMocks() {
		httpmock.Reset()
		mock.RegisterURL("http://localhost/api/v1/status", version, "status")
		mock.RegisterURL("http://localhost/api/v1/alerts/groups", version, "alerts/groups")

		v := alertmanager.GetVersion()
		if v != version {
			t.Errorf("GetVersion() returned '%s', expected '%s'", v, version)
		}

		groups, err := alertmanager.GetAlerts(v)
		if err != nil {
			t.Errorf("GetAlerts(%s) failed: %s", version, err.Error())
		}
		if len(groups) != 10 {
			t.Errorf("Got %d groups, expected 10", len(groups))
		}
	}
}

func TestGetSilences(t *testing.T) {
	log.SetLevel(log.ErrorLevel)
	config.Config.AlertmanagerURI = "http://localhost"

	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	for _, version := range mock.ListAllMocks() {
		httpmock.Reset()
		mock.RegisterURL("http://localhost/api/v1/status", version, "status")
		mock.RegisterURL("http://localhost/api/v1/silences", version, "silences")

		v := alertmanager.GetVersion()
		if v != version {
			t.Errorf("GetVersion() returned '%s', expected '%s'", v, version)
		}

		silences, err := alertmanager.GetSilences(v)
		if err != nil {
			t.Errorf("GetSilences(%s) failed: %s", version, err.Error())
		}
		if len(silences) != 3 {
			t.Errorf("Got %d silences, expected %d", len(silences), 3)
		}
	}
}
