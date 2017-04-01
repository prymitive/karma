package alertmanager_test

import (
	"io/ioutil"
	"testing"

	log "github.com/Sirupsen/logrus"
	"github.com/cloudflare/unsee/alertmanager"
	httpmock "gopkg.in/jarcoal/httpmock.v1"
)

func TestSilenceAPIResponseGet(t *testing.T) {
	log.SetOutput(ioutil.Discard) // disable logging to console
	httpmock.Activate()
	defer httpmock.DeactivateAndReset()
	mockJSON, err := ioutil.ReadFile("../mock/api/v1/silences")
	if err != nil {
		t.Errorf("Can't open mock 'silences' file: %s", err.Error())
	}
	httpmock.RegisterResponder("GET", "api/v1/silences", httpmock.NewBytesResponder(200, mockJSON))

	response := alertmanager.SilenceAPIResponse{}
	err = response.Get()
	if err != nil {
		t.Errorf("SilenceAPIResponse.Get() failed: %s", err.Error())
	}
	if response.Status != "success" {
		t.Errorf("Invalid SilenceAPIResponse status: %s", response.Status)
	}
}
