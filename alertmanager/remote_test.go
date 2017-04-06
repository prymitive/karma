package alertmanager

import (
	"io/ioutil"
	"testing"
	"time"

	log "github.com/Sirupsen/logrus"
	httpmock "gopkg.in/jarcoal/httpmock.v1"
)

type mockJSONResponse struct {
	status  string
	integer int
	yes     bool
	no      bool
}

func TestGetJSONFromURL(t *testing.T) {
	log.SetOutput(ioutil.Discard) // disable logging to console
	httpmock.Activate()
	defer httpmock.DeactivateAndReset()
	mockJSON := `{
		"response": "success",
		"integer": 123,
		"yes": true,
		"no": false
	}`
	httpmock.RegisterResponder("GET", "http://localhost/", httpmock.NewStringResponder(200, mockJSON))

	response := mockJSONResponse{}
	err := getJSONFromURL("http://localhost/", time.Second, &response)
	if err != nil {
		t.Errorf("getJSONFromURL() failed: %s", err.Error())
	}

	httpmock.RegisterResponder("GET", "http://localhost/404", httpmock.NewStringResponder(404, "Not found"))
	response = mockJSONResponse{}
	err = getJSONFromURL("http://localhost/404", time.Second, &response)
	if err == nil {
		t.Errorf("getJSONFromURL() on invalid url didn't return 404, response: %v", response)
	}
}
