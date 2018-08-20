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

func TestKnownLabelNames(t *testing.T) {
	mockConfig()
	for _, version := range mock.ListAllMocks() {
		t.Logf("Testing known labels using mock files from Alertmanager %s", version)
		mockAlerts(version)
		r := ginTestEngine()

		// repeat test a few times to test cached responses
		for i := 1; i <= 3; i++ {
			req := httptest.NewRequest("GET", "/labelNames.json", nil)
			resp := httptest.NewRecorder()
			r.ServeHTTP(resp, req)

			if resp.Code != http.StatusOK {
				t.Errorf("Invalid status code for request without any query: %d", resp.Code)
			}

			for _, testCase := range labelTests {
				url := fmt.Sprintf("/labelNames.json?term=%s", testCase.Term)
				req := httptest.NewRequest("GET", url, nil)
				resp := httptest.NewRecorder()
				r.ServeHTTP(resp, req)

				if resp.Code != http.StatusOK {
					t.Errorf("GET %s returned status %d", url, resp.Code)
				}

				ur := []string{}
				err := json.Unmarshal(resp.Body.Bytes(), &ur)
				if err != nil {
					t.Errorf("Failed to unmarshal response: %s", err)
				}

				if len(ur) != len(testCase.Results) {
					t.Errorf("Invalid number of label names for %s, got %d, expected %d", url, len(ur), len(testCase.Results))
					t.Errorf("Results: %s", ur)
				}
			}
		}
	}
}

type valueTest struct {
	Name    string
	Results []string
}

var valueTests = []valueTest{
	{
		Name:    "foobar",
		Results: []string{},
	},
	{
		Name:    "alertname",
		Results: []string{"Free_Disk_Space_Too_Low", "HTTP_Probe_Failed", "Host_Down", "Memory_Usage_Too_High"},
	},
	{
		Name:    "cluster",
		Results: []string{"dev", "prod", "staging"},
	},
}

func TestKnownLabelValues(t *testing.T) {
	mockConfig()
	for _, version := range mock.ListAllMocks() {
		t.Logf("Testing known label values using mock files from Alertmanager %s", version)
		mockAlerts(version)
		r := ginTestEngine()

		// repeat test a few times to test cached responses
		for i := 1; i <= 3; i++ {
			req := httptest.NewRequest("GET", "/labelValues.json", nil)
			resp := httptest.NewRecorder()
			r.ServeHTTP(resp, req)
			if resp.Code != http.StatusBadRequest {
				t.Errorf("Invalid status code for request without any query: %d", resp.Code)
			}

			for _, testCase := range valueTests {
				url := fmt.Sprintf("/labelValues.json?name=%s", testCase.Name)
				req := httptest.NewRequest("GET", url, nil)
				resp := httptest.NewRecorder()
				r.ServeHTTP(resp, req)

				if resp.Code != http.StatusOK {
					t.Errorf("GET %s returned status %d", url, resp.Code)
				}

				ur := []string{}
				err := json.Unmarshal(resp.Body.Bytes(), &ur)
				if err != nil {
					t.Errorf("Failed to unmarshal response: %s", err)
				}

				if len(ur) != len(testCase.Results) {
					t.Errorf("Invalid number of label values for %s, got %d, expected %d", url, len(ur), len(testCase.Results))
					t.Errorf("Results: %s", ur)
				}
			}
		}
	}
}
