package main

import (
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"testing"

	"github.com/prymitive/karma/internal/mock"
)

type requestTest struct {
	PathSuffix string
	StatusCode int
	Results    []string
}

type autocompleteTest struct {
	PathPrefix string
	Tests      []requestTest
}

var autocompleteTests = []autocompleteTest{
	{
		PathPrefix: "/labelNames.json",
		Tests: []requestTest{
			{
				PathSuffix: "",
				StatusCode: 200,
				Results:    []string{"alertname", "cluster", "disk", "instance", "ip", "job"},
			},
			{
				PathSuffix: "?term=",
				StatusCode: 200,
				Results:    []string{"alertname", "cluster", "disk", "instance", "ip", "job"},
			},
			{
				PathSuffix: "?term=a",
				StatusCode: 200,
				Results:    []string{"alertname", "instance"},
			},
			{
				PathSuffix: "?term=alertname",
				StatusCode: 200,
				Results:    []string{"alertname"},
			},
			{
				PathSuffix: "?term=1234567890",
				StatusCode: 200,
				Results:    []string{},
			},
		},
	},
	{
		PathPrefix: "/labelValues.json",
		Tests: []requestTest{
			{
				PathSuffix: "?name=",
				StatusCode: 400,
				Results:    []string{},
			},
			{
				PathSuffix: "?name=foobar",
				StatusCode: 200,
				Results:    []string{},
			},
			{
				PathSuffix: "?name=alertname",
				StatusCode: 200,
				Results:    []string{"Free_Disk_Space_Too_Low", "HTTP_Probe_Failed", "Host_Down", "Memory_Usage_Too_High"},
			},
			{
				PathSuffix: "?name=cluster",
				StatusCode: 200,
				Results:    []string{"dev", "prod", "staging"},
			},
		},
	},
}

func TestLabelAutocomplete(t *testing.T) {
	mockConfig()
	for _, version := range mock.ListAllMocks() {
		t.Logf("Testing labels autocomplete using mock files from Alertmanager %s", version)
		mockAlerts(version)
		r := testRouter()
		setupRouter(r, nil)

		for _, testVariant := range autocompleteTests {
			for _, testCase := range testVariant.Tests {
				// repeat each test a few times to test cached responses
				for i := 1; i <= 3; i++ {
					url := fmt.Sprintf("%s%s", testVariant.PathPrefix, testCase.PathSuffix)
					req := httptest.NewRequest("GET", url, nil)
					resp := httptest.NewRecorder()
					r.ServeHTTP(resp, req)

					if resp.Code != testCase.StatusCode {
						t.Errorf("GET %s returned status %d, expected %d", url, resp.Code, testCase.StatusCode)
					}

					if resp.Code < 300 {
						ur := []string{}
						err := json.Unmarshal(resp.Body.Bytes(), &ur)
						if err != nil {
							t.Errorf("Failed to unmarshal response: %s", err)
						}

						if len(ur) != len(testCase.Results) {
							t.Errorf("Invalid number of responses for %s, got %d, expected %d", url, len(ur), len(testCase.Results))
							t.Errorf("Results: %s", ur)
						}
					}
				}
			}
		}
	}
}
