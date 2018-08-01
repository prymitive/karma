package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/prymitive/unsee/internal/mock"
)

type labelTest struct {
	Term    string
	Results []string
}

var labelTests = []labelTest{
	{
		Term:    "a",
		Results: []string{"alertname", "instance"},
	},
	{
		Term:    "alertname",
		Results: []string{"alertname"},
	},
	{
		Term:    "1234567890",
		Results: []string{},
	},
	{
		Term:    "",
		Results: []string{"alertname", "cluster", "instance", "job"},
	},
}

func TestKnownLabels(t *testing.T) {
	mockConfig()
	for _, version := range mock.ListAllMocks() {
		t.Logf("Testing known labels using mock files from Alertmanager %s", version)
		mockAlerts(version)
		r := ginTestEngine()

		req, _ := http.NewRequest("GET", "/labelNames.json", nil)
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != http.StatusOK {
			t.Errorf("Invalid status code for request without any query: %d", resp.Code)
		}

		for _, testCase := range labelTests {
			url := fmt.Sprintf("/labelNames.json?term=%s", testCase.Term)
			req, _ := http.NewRequest("GET", url, nil)
			resp := httptest.NewRecorder()
			r.ServeHTTP(resp, req)

			if resp.Code != http.StatusOK {
				t.Errorf("GET %s returned status %d", url, resp.Code)
			}

			ur := []string{}
			json.Unmarshal(resp.Body.Bytes(), &ur)

			if len(ur) != len(testCase.Results) {
				t.Errorf("Invalid number of label names for %s, got %d, expected %d", url, len(ur), len(testCase.Results))
				t.Errorf("Results: %s", ur)
			}
		}
	}
}
