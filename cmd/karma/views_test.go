package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"regexp"
	"sort"
	"strings"
	"testing"

	"github.com/beme/abide"
	lru "github.com/hashicorp/golang-lru/v2"

	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/intern"
	"github.com/prymitive/karma/internal/mock"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/regex"
	"github.com/prymitive/karma/internal/slices"

	"github.com/go-chi/chi/v5"
	"github.com/google/go-cmp/cmp"
	"github.com/jarcoal/httpmock"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/pflag"
)

var upstreamSetup = false

type setenvFunc func(key, val string)

func mockConfig(setenv setenvFunc) {
	zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	setenv("ALERTMANAGER_URI", "http://localhost")
	setenv("LABELS_COLOR_UNIQUE", "alertname @receiver @alertmanager @cluster")

	f := pflag.NewFlagSet(".", pflag.ExitOnError)
	config.SetupFlags(f)
	_, err := config.Config.Read(f)
	if err != nil {
		log.Fatal().Err(err).Msg("Error")
	}

	if !upstreamSetup {
		upstreamSetup = true
		err := setupUpstreams()
		if err != nil {
			log.Fatal().Err(err).Msg("Error")
		}
	}
}

func testRouter() *chi.Mux {
	router := chi.NewRouter()
	router.Use(proxyPathFixMiddleware)

	err := loadTemplates()
	if err != nil {
		panic(err)
	}

	return router
}

func TestHealth(t *testing.T) {
	mockConfig(t.Setenv)
	r := testRouter()
	setupRouter(r, nil)
	req := httptest.NewRequest("GET", "/health", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusOK {
		t.Errorf("GET /health returned status %d", resp.Code)
	}
}

func TestRobots(t *testing.T) {
	mockConfig(t.Setenv)
	r := testRouter()
	setupRouter(r, nil)
	req := httptest.NewRequest("GET", "/robots.txt", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusOK {
		t.Errorf("GET /robots.txt returned status %d", resp.Code)
	}
}

func TestVersion(t *testing.T) {
	mockConfig(t.Setenv)
	r := testRouter()
	setupRouter(r, nil)
	req := httptest.NewRequest("GET", "/version", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusOK {
		t.Errorf("GET /version returned status %d", resp.Code)
	}
}

func TestHealthPrefix(t *testing.T) {
	t.Setenv("LISTEN_PREFIX", "/prefix")
	defer os.Unsetenv("LISTEN_PREFIX")
	mockConfig(t.Setenv)
	r := testRouter()
	setupRouter(r, nil)
	req := httptest.NewRequest("GET", "/prefix/health", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusOK {
		t.Errorf("GET /prefix/health returned status %d", resp.Code)
	}
}

func TestIndex(t *testing.T) {
	type testCaseT struct {
		prefix   string
		request  string
		status   int
		redirect string
	}

	testCases := []testCaseT{
		{
			prefix:  "",
			request: "/",
			status:  200,
		},
		{
			prefix:  "",
			request: "/alertList.json",
			status:  200,
		},
		{
			prefix:  "/",
			request: "/",
			status:  200,
		},
		{
			prefix:  "/",
			request: "/alertList.json",
			status:  200,
		},
		{
			prefix:  "/prefix",
			request: "/",
			status:  404,
		},
		{
			prefix:  "/prefix",
			request: "/alertList.json",
			status:  404,
		},
		{
			prefix:  "/prefix",
			request: "/prefix/",
			status:  200,
		},
		{
			prefix:  "/prefix",
			request: "/prefix/alertList.json",
			status:  200,
		},
		{
			prefix:   "/prefix",
			request:  "/prefix",
			status:   301,
			redirect: "/prefix/",
		},
		{
			prefix:   "/prefix/",
			request:  "/prefix",
			status:   301,
			redirect: "/prefix/",
		},
		{
			prefix:  "/prefix/",
			request: "/prefix/",
			status:  200,
		},
		{
			prefix:  "/prefix/",
			request: "/prefix/alertList.json",
			status:  200,
		},
	}

	defer func() {
		config.Config.Listen.Prefix = "/"
	}()

	for _, tc := range testCases {
		t.Run(fmt.Sprintf("prefix=%s request=%s status=%d", tc.prefix, tc.request, tc.status), func(t *testing.T) {
			t.Setenv("LISTEN_PREFIX", tc.prefix)
			defer os.Unsetenv("LISTEN_PREFIX")
			mockConfig(t.Setenv)
			r := testRouter()
			setupRouter(r, nil)
			mockCache()
			req := httptest.NewRequest("GET", tc.request, nil)
			resp := httptest.NewRecorder()
			r.ServeHTTP(resp, req)
			if resp.Code != tc.status {
				t.Errorf("GET %s returned status %d, expected %d", tc.request, resp.Code, tc.status)
				return
			}
			if resp.Code/100 == 3 && tc.status/100 == 3 {
				if resp.Header().Get("Location") != tc.redirect {
					t.Errorf("GET %s returned redirect to %s, expected %s", tc.request, resp.Header().Get("Location"), tc.redirect)
				}
			}
		})
	}
}

func mockCache() {
	if apiCache == nil {
		apiCache, _ = lru.New[string, []byte](100)
	} else {
		apiCache.Purge()
	}
}

func mockAlerts(version string) {
	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	mockCache()

	mock.RegisterURL("http://localhost/metrics", version, "metrics")
	mock.RegisterURL("http://localhost/api/v2/silences", version, "api/v2/silences")
	mock.RegisterURL("http://localhost/api/v2/alerts/groups", version, "api/v2/alerts/groups")

	pullFromAlertmanager()
}

func TestAlerts(t *testing.T) {
	payload, err := json.Marshal(models.AlertsRequest{
		Filters: []string{
			"@receiver=by-cluster-service",
			"alertname=HTTP_Probe_Failed",
			"instance=web1",
		},
		GridLimits:        map[string]int{},
		DefaultGroupLimit: 5,
	})
	if err != nil {
		t.Error(err)
		t.FailNow()
	}

	mockConfig(t.Setenv)
	for _, version := range mock.ListAllMocks() {
		t.Logf("Testing alerts using mock files from Alertmanager %s", version)
		mockAlerts(version)
		r := testRouter()
		setupRouter(r, nil)
		// re-run a few times to test the cache
		for i := 1; i <= 3; i++ {
			req := httptest.NewRequest("POST", "/alerts.json", bytes.NewReader(payload))
			resp := httptest.NewRecorder()
			r.ServeHTTP(resp, req)
			if resp.Code != http.StatusOK {
				t.Errorf("POST /alerts.json returned status %d", resp.Code)
			}

			ur := models.AlertsResponse{}
			err := json.Unmarshal(resp.Body.Bytes(), &ur)
			if err != nil {
				t.Errorf("Failed to unmarshal response: %s", err)
			}
			if len(ur.Filters) != 3 {
				t.Errorf("[%s] Got %d filter(s) in response, expected %d", version, len(ur.Filters), 3)
			}
			if len(ur.Colors) != 4 {
				t.Errorf("[%s] Got %d color(s) in response, expected %d", version, len(ur.Colors), 4)
			}
			if len(ur.Grids[0].AlertGroups) != 1 {
				t.Errorf("[%s] Got %d alert group(s) in response, expected %d", version, len(ur.Grids[0].AlertGroups), 1)
			}
			if ur.Version == "" {
				t.Errorf("[%s] Empty version in response", version)
			}
			if ur.Timestamp == "" {
				t.Errorf("[%s] Empty timestamp in response", version)
			}
			if ur.Upstreams.Counters.Total == 0 {
				t.Errorf("[%s] No instances in upstream counter: %v", version, ur.Upstreams.Counters)
			}
			if ur.Upstreams.Counters.Healthy == 0 {
				t.Errorf("[%s] No healthy instances in upstream counter: %v", version, ur.Upstreams.Counters)
			}
			if ur.Upstreams.Counters.Failed > 0 {
				t.Errorf("[%s] %d error(s) in upstream status: %v", version, ur.Upstreams.Counters.Failed, ur.Upstreams)
			}
			if len(ur.Upstreams.Instances) == 0 {
				t.Errorf("[%s] No instances in upstream status: %v", version, ur.Upstreams.Instances)
			}
			if ur.Status != "success" {
				t.Errorf("[%s] Invalid status in response: %s", version, ur.Status)
			}
			for _, ag := range ur.Grids[0].AlertGroups {
				for _, a := range ag.Alerts {
					linkCount := 0
					for _, annotation := range a.Annotations {
						if annotation.IsLink {
							linkCount++
						}
					}
					if linkCount != 1 {
						t.Errorf("Invalid number of links, got %d, expected 1, %v", linkCount, a)
					}
					if len(a.Alertmanager) == 0 {
						t.Errorf("Alertmanager instance list is empty, %v", a)
					}
				}
			}
		}
	}
}

func TestAlertsBadRequest(t *testing.T) {
	mockConfig(t.Setenv)
	for _, version := range mock.ListAllMocks() {
		t.Logf("Testing alerts using mock files from Alertmanager %s", version)
		mockAlerts(version)
		r := testRouter()
		setupRouter(r, nil)
		// re-run a few times to test the cache
		for i := 1; i <= 3; i++ {
			req := httptest.NewRequest("POST", "/alerts.json", bytes.NewReader([]byte("foo bar{}")))
			resp := httptest.NewRecorder()
			r.ServeHTTP(resp, req)
			if resp.Code != http.StatusBadRequest {
				t.Errorf("POST /alerts.json returned status %d", resp.Code)
			}
		}
	}
}

func TestAlertsLimitFallback(t *testing.T) {
	payload, err := json.Marshal(models.AlertsRequest{
		Filters:           []string{},
		GridLimits:        map[string]int{},
		GridLabel:         "",
		DefaultGroupLimit: 0,
	})
	if err != nil {
		t.Error(err)
		t.FailNow()
	}

	mockConfig(t.Setenv)
	config.Config.UI.AlertsPerGroup = 1
	for _, version := range mock.ListAllMocks() {
		t.Logf("Testing alerts using mock files from Alertmanager %s", version)
		mockAlerts(version)
		r := testRouter()
		setupRouter(r, nil)
		// re-run a few times to test the cache
		for i := 1; i <= 3; i++ {
			req := httptest.NewRequest("POST", "/alerts.json", bytes.NewReader(payload))
			resp := httptest.NewRecorder()
			r.ServeHTTP(resp, req)
			if resp.Code != http.StatusOK {
				t.Errorf("POST /alerts.json returned status %d", resp.Code)
			}

			ur := models.AlertsResponse{}
			err := json.Unmarshal(resp.Body.Bytes(), &ur)
			if err != nil {
				t.Errorf("Failed to unmarshal response: %s", err)
			}
			for _, grid := range ur.Grids {
				for _, ag := range grid.AlertGroups {
					al := len(ag.Alerts)
					if al > 1 {
						t.Errorf("[%s] Got %d alert group(s) in response, expected 1", version, al)
					}
				}
			}
		}
	}
}

func TestGrids(t *testing.T) {
	type testCaseGridT struct {
		labelValue      string
		alertGroupCount int
	}
	type testCaseT struct {
		request models.AlertsRequest
		grids   []testCaseGridT
	}
	testCases := []testCaseT{
		{
			request: models.AlertsRequest{
				GridLabel:         "cluster",
				GridLimits:        map[string]int{},
				DefaultGroupLimit: 5,
			},
			grids: []testCaseGridT{
				{labelValue: "dev", alertGroupCount: 4},
				{labelValue: "prod", alertGroupCount: 4},
				{labelValue: "staging", alertGroupCount: 4},
			},
		},
		{
			request: models.AlertsRequest{
				GridLabel:         "cluster",
				GridLimits:        map[string]int{},
				GridSortReverse:   true,
				DefaultGroupLimit: 5,
			},
			grids: []testCaseGridT{
				{labelValue: "staging", alertGroupCount: 4},
				{labelValue: "prod", alertGroupCount: 4},
				{labelValue: "dev", alertGroupCount: 4},
			},
		},
		{
			request: models.AlertsRequest{
				GridLabel:         "foo",
				GridLimits:        map[string]int{},
				DefaultGroupLimit: 5,
			},
			grids: []testCaseGridT{
				{labelValue: "", alertGroupCount: 10},
			},
		},
		{
			request: models.AlertsRequest{
				GridLabel:         "",
				GridLimits:        map[string]int{},
				DefaultGroupLimit: 5,
			},
			grids: []testCaseGridT{
				{labelValue: "", alertGroupCount: 10},
			},
		},
		{
			request: models.AlertsRequest{
				GridLabel:         "",
				GridLimits:        map[string]int{},
				Filters:           []string{"foo=bar"},
				DefaultGroupLimit: 5,
			},
			grids: []testCaseGridT{},
		},
		{
			request: models.AlertsRequest{
				GridLabel:         "disk",
				GridLimits:        map[string]int{},
				DefaultGroupLimit: 5,
			},
			grids: []testCaseGridT{
				{labelValue: "sda", alertGroupCount: 2},
				{labelValue: "", alertGroupCount: 8},
			},
		},
		{
			request: models.AlertsRequest{
				GridLabel:         "disk",
				GridLimits:        map[string]int{},
				GridSortReverse:   true,
				DefaultGroupLimit: 5,
			},
			grids: []testCaseGridT{
				{labelValue: "", alertGroupCount: 8},
				{labelValue: "sda", alertGroupCount: 2},
			},
		},
		{
			request: models.AlertsRequest{
				GridLabel:         "disk",
				GridLimits:        map[string]int{},
				Filters:           []string{"alertname=Free_Disk_Space_Too_Low"},
				DefaultGroupLimit: 5,
			},
			grids: []testCaseGridT{
				{labelValue: "sda", alertGroupCount: 2},
			},
		},
		{
			request: models.AlertsRequest{
				GridLabel:         "@alertmanager",
				GridLimits:        map[string]int{},
				DefaultGroupLimit: 5,
			},
			grids: []testCaseGridT{
				{labelValue: "default", alertGroupCount: 10},
			},
		},
		{
			request: models.AlertsRequest{
				GridLabel:         "@cluster",
				GridLimits:        map[string]int{},
				DefaultGroupLimit: 5,
			},
			grids: []testCaseGridT{
				{labelValue: "default", alertGroupCount: 10},
			},
		},
		{
			request: models.AlertsRequest{
				GridLabel:         "@receiver",
				GridLimits:        map[string]int{},
				DefaultGroupLimit: 5,
			},
			grids: []testCaseGridT{
				{labelValue: "by-cluster-service", alertGroupCount: 6},
				{labelValue: "by-name", alertGroupCount: 4},
			},
		},
		{
			request: models.AlertsRequest{
				GridLabel:         "@receiver",
				GridLimits:        map[string]int{},
				GridSortReverse:   true,
				DefaultGroupLimit: 5,
			},
			grids: []testCaseGridT{
				{labelValue: "by-name", alertGroupCount: 4},
				{labelValue: "by-cluster-service", alertGroupCount: 6},
			},
		},
		{
			request: models.AlertsRequest{
				GridLabel:         "@receiver",
				GridLimits:        map[string]int{},
				Filters:           []string{"@receiver=by-name"},
				DefaultGroupLimit: 5,
			},
			grids: []testCaseGridT{
				{labelValue: "by-name", alertGroupCount: 4},
			},
		},
	}

	mockConfig(t.Setenv)
	for _, version := range mock.ListAllMocks() {
		version := version
		for _, testCase := range testCases {
			testCase := testCase
			t.Run(fmt.Sprintf("version=%q request=%v", version, testCase.request), func(t *testing.T) {
				payload, err := json.Marshal(testCase.request)
				if err != nil {
					t.Error(err)
					t.FailNow()
				}

				mockAlerts(version)
				r := testRouter()
				setupRouter(r, nil)
				// re-run a few times to test the cache
				for i := 1; i <= 3; i++ {
					apiCache.Purge()
					req := httptest.NewRequest("POST", "/alerts.json", bytes.NewReader(payload))
					resp := httptest.NewRecorder()
					r.ServeHTTP(resp, req)
					if resp.Code != http.StatusOK {
						t.Errorf("POST /alerts.json returned status %d", resp.Code)
					}

					ur := models.AlertsResponse{}
					err := json.Unmarshal(resp.Body.Bytes(), &ur)
					if err != nil {
						t.Errorf("Failed to unmarshal response: %s", err)
					}

					if len(ur.Grids) != len(testCase.grids) {
						t.Errorf("Expected %d grids, got %d", len(testCase.grids), len(ur.Grids))
					} else {
						for index, expectedGrid := range testCase.grids {
							grid := ur.Grids[index]
							if grid.LabelName != testCase.request.GridLabel {
								t.Errorf("Got wrong labelName for grid %d: %q, expected %q", index, grid.LabelName, testCase.request.GridLabel)
							}
							if grid.LabelValue != expectedGrid.labelValue {
								t.Errorf("Got wrong labelValue for grid %d: %q, expected %q", index, grid.LabelValue, expectedGrid.labelValue)
							}
							if len(grid.AlertGroups) != expectedGrid.alertGroupCount {
								t.Errorf("Got wrong alert group count for grid %d: %d, expected %d", index, len(grid.AlertGroups), expectedGrid.alertGroupCount)
							}
						}
					}
				}
			})
		}
	}
}

func TestValidateAllAlerts(t *testing.T) {
	payload, err := json.Marshal(models.AlertsRequest{
		Filters: []string{
			"alertname=HTTP_Probe_Failed",
			"instance=web1",
		},
		GridLimits:        map[string]int{},
		DefaultGroupLimit: 5,
	})
	if err != nil {
		t.Error(err)
		t.FailNow()
	}

	mockConfig(t.Setenv)
	for _, version := range mock.ListAllMocks() {
		t.Logf("Validating alerts.json response using mock files from Alertmanager %s", version)
		mockAlerts(version)
		r := testRouter()
		setupRouter(r, nil)
		// re-run a few times to test the cache
		for i := 1; i <= 3; i++ {
			req := httptest.NewRequest("POST", "/alerts.json", bytes.NewReader(payload))
			resp := httptest.NewRecorder()
			r.ServeHTTP(resp, req)
			if resp.Code != http.StatusOK {
				t.Errorf("POST /alerts.json returned status %d", resp.Code)
			}
			ur := models.AlertsResponse{}
			body := resp.Body.Bytes()
			err := json.Unmarshal(body, &ur)
			if err != nil {
				t.Errorf("Failed to unmarshal response: %s", err)
			}
			for _, ag := range ur.Grids[0].AlertGroups {
				for _, a := range ag.Alerts {
					if !slices.StringInSlice(models.AlertStateList, a.State) {
						t.Errorf("Invalid alert status '%s', not in %v", a.State, models.AlertStateList)
					}
					if len(a.Alertmanager) == 0 {
						t.Errorf("Alertmanager instance list is empty, %v", a)
					}
				}
			}
		}
	}
}

type acTestCase struct {
	Term    string
	Results []string
}

var acTests = []acTestCase{
	{
		Term: "ale",
		Results: []string{
			"alertname=Memory_Usage_Too_High",
			"alertname=Host_Down",
			"alertname=HTTP_Probe_Failed",
			"alertname=Free_Disk_Space_Too_Low",
			"alertname!=Memory_Usage_Too_High",
			"alertname!=Host_Down",
			"alertname!=HTTP_Probe_Failed",
			"alertname!=Free_Disk_Space_Too_Low",
			"@alertmanager=default",
			"@alertmanager!=default",
		},
	},
	{
		Term: "alert",
		Results: []string{
			"alertname=Memory_Usage_Too_High",
			"alertname=Host_Down",
			"alertname=HTTP_Probe_Failed",
			"alertname=Free_Disk_Space_Too_Low",
			"alertname!=Memory_Usage_Too_High",
			"alertname!=Host_Down",
			"alertname!=HTTP_Probe_Failed",
			"alertname!=Free_Disk_Space_Too_Low",
			"@alertmanager=default",
			"@alertmanager!=default",
		},
	},
	{
		Term: "alertname",
		Results: []string{
			"alertname=Memory_Usage_Too_High",
			"alertname=Host_Down",
			"alertname=HTTP_Probe_Failed",
			"alertname=Free_Disk_Space_Too_Low",
			"alertname!=Memory_Usage_Too_High",
			"alertname!=Host_Down",
			"alertname!=HTTP_Probe_Failed",
			"alertname!=Free_Disk_Space_Too_Low",
		},
	},
	{
		Term: "aLeRtNaMe",
		Results: []string{
			"alertname=Memory_Usage_Too_High",
			"alertname=Host_Down",
			"alertname=HTTP_Probe_Failed",
			"alertname=Free_Disk_Space_Too_Low",
			"alertname!=Memory_Usage_Too_High",
			"alertname!=Host_Down",
			"alertname!=HTTP_Probe_Failed",
			"alertname!=Free_Disk_Space_Too_Low",
		},
	},
	{
		Term: "http",
		Results: []string{
			"alertname=HTTP_Probe_Failed",
			"alertname!=HTTP_Probe_Failed",
		},
	},
	{
		Term: "hTTp_",
		Results: []string{
			"alertname=HTTP_Probe_Failed",
			"alertname!=HTTP_Probe_Failed",
		},
	},
	{
		Term: "@st",
		Results: []string{
			"@state=suppressed",
			"@state=active",
			"@state!=suppressed",
			"@state!=active",
		},
	},
	{
		Term: "@r",
		Results: []string{
			"@receiver=by-name",
			"@receiver=by-cluster-service",
			"@receiver!=by-name",
			"@receiver!=by-cluster-service",
		},
	},
	{
		Term: "@age",
		Results: []string{
			"@age>1h",
			"@age>10m",
			"@age<1h",
			"@age<10m",
		},
	},
	{
		Term: "@limit",
		Results: []string{
			"@limit=50",
			"@limit=10",
		},
	},
	{
		Term: "@alertmanager",
		Results: []string{
			"@alertmanager=default",
			"@alertmanager!=default",
		},
	},
	{
		Term: "nod",
		Results: []string{
			"job=node_ping",
			"job=node_exporter",
			"job!=node_ping",
			"job!=node_exporter",
		},
	},
	{
		Term: "Nod",
		Results: []string{
			"job=node_ping",
			"job=node_exporter",
			"job!=node_ping",
			"job!=node_exporter",
		},
	},
	// duplicated to test response caching
	{
		Term: "Nod",
		Results: []string{
			"job=node_ping",
			"job=node_exporter",
			"job!=node_ping",
			"job!=node_exporter",
		},
	},
}

func TestAutocomplete(t *testing.T) {
	mockConfig(t.Setenv)
	for _, version := range mock.ListAllMocks() {
		t.Logf("Testing autocomplete using mock files from Alertmanager %s", version)
		mockAlerts(version)
		r := testRouter()
		setupRouter(r, nil)

		// re-run a few times to test the cache
		for i := 1; i <= 3; i++ {
			req := httptest.NewRequest("GET", "/autocomplete.json", nil)
			resp := httptest.NewRecorder()
			r.ServeHTTP(resp, req)
			if resp.Code != http.StatusBadRequest {
				t.Errorf("Invalid status code for request without any query: %d", resp.Code)
			}

			for _, acTest := range acTests {
				url := fmt.Sprintf("/autocomplete.json?term=%s", acTest.Term)
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

				if len(ur) != len(acTest.Results) {
					t.Errorf("Invalid number of autocomplete hints for %s, got %d, expected %d", url, len(ur), len(acTest.Results))
					t.Errorf("Results: %s", ur)
				}
				for i := range ur {
					if ur[i] != acTest.Results[i] {
						t.Errorf("Result mismatch for term='%s', got '%s' when '%s' was expected", acTest.Term, ur[i], acTest.Results[i])
					}
				}
			}
		}
	}
}

func TestGzipMiddleware(t *testing.T) {
	mockConfig(t.Setenv)
	r := testRouter()
	setupRouter(r, nil)
	paths := []string{"/", "/alertList.json", "/autocomplete.json", "/metrics"}
	for _, path := range paths {
		// re-run a few times to test the cache
		for i := 1; i <= 3; i++ {
			req := httptest.NewRequest("GET", path, nil)
			req.Header.Set("Accept-Encoding", "gzip")
			resp := httptest.NewRecorder()
			r.ServeHTTP(resp, req)
			h := resp.Header()

			ce := h.Get("Content-Encoding")
			if ce != "gzip" {
				t.Errorf("Inavlid 'Content-Encoding' in response for '%s', expected 'gzip', got '%s'", path, ce)
			}

			bs := h.Get("Content-Length")
			if fmt.Sprint(resp.Body.Len()) != bs {
				t.Errorf("Invalid 'Content-Length' in response for '%s', body size was %d but header value was '%s'", path, resp.Body.Len(), bs)
			}
		}
	}
}

func TestGzipMiddlewareWithoutAcceptEncoding(t *testing.T) {
	mockConfig(t.Setenv)
	r := testRouter()
	setupRouter(r, nil)
	paths := []string{"/", "/alertList.json", "/autocomplete.json", "/metrics"}
	for _, path := range paths {
		// re-run a few times to test the cache
		for i := 1; i <= 3; i++ {
			req := httptest.NewRequest("GET", path, nil)
			req.Header.Set("Accept-Encoding", "") // ensure that we don't pass anything up
			resp := httptest.NewRecorder()
			r.ServeHTTP(resp, req)
			h := resp.Header()

			ce := h.Get("Content-Encoding")
			if ce == "gzip" {
				t.Errorf("Inavlid 'Content-Encoding' in response for '%s', expected '', got '%s'", path, ce)
			}

			bs := h.Get("Content-Length")
			// if we got Content-Length then compare it with body size
			if bs != "" && fmt.Sprint(resp.Body.Len()) != bs {
				t.Errorf("Invalid 'Content-Length' in response for '%s', body size was %d but header value was '%s'", path, resp.Body.Len(), bs)
			}
		}
	}
}

func TestSilences(t *testing.T) {
	type silenceTestCase struct {
		searchTerm  string
		sortReverse string
		showExpired string
		results     []string
	}

	silenceServer7 := "Silenced server7"
	silenceHostDown := "Silenced Host_Down alerts in the dev cluster"
	silenceInstance := "Silenced instance"

	silenceTestCases := []silenceTestCase{
		{
			searchTerm:  "",
			sortReverse: "",
			showExpired: "",
			results:     []string{silenceHostDown, silenceInstance, silenceServer7},
		},
		{
			searchTerm:  "",
			sortReverse: "1",
			showExpired: "1",
			results:     []string{silenceHostDown, silenceInstance, silenceServer7},
		},
		{
			searchTerm:  "john",
			sortReverse: "",
			showExpired: "",
			results:     []string{silenceHostDown, silenceInstance, silenceServer7},
		},
		{
			searchTerm:  "john@example.com",
			sortReverse: "",
			showExpired: "",
			results:     []string{silenceHostDown, silenceInstance, silenceServer7},
		},
		{
			searchTerm:  "instance=web",
			sortReverse: "0",
			showExpired: "0",
			results:     []string{silenceInstance},
		},
		{
			searchTerm:  "instance=web1",
			sortReverse: "1",
			showExpired: "0",
			results:     []string{silenceInstance},
		},
		{
			searchTerm:  "instance=\"web1\"",
			sortReverse: "0",
			showExpired: "0",
			results:     []string{silenceInstance},
		},
		{
			searchTerm:  "instance=\"web",
			sortReverse: "0",
			showExpired: "0",
			results:     []string{},
		},
		{
			searchTerm:  "instance=web123",
			sortReverse: "0",
			showExpired: "1",
			results:     []string{},
		},
		{
			searchTerm:  "alertname=Host_Down",
			sortReverse: "0",
			showExpired: "1",
			results:     []string{silenceHostDown},
		},
		{
			searchTerm:  "instance",
			sortReverse: "0",
			showExpired: "1",
			results:     []string{silenceInstance, silenceServer7},
		},
		{
			searchTerm:  "nstance",
			sortReverse: "0",
			showExpired: "1",
			results:     []string{silenceInstance, silenceServer7},
		},
		{
			searchTerm:  "alertname=~Host_Down",
			sortReverse: "0",
			showExpired: "1",
			results:     []string{},
		},
		{
			searchTerm:  "@cluster=foo",
			sortReverse: "0",
			showExpired: "0",
			results:     []string{},
		},
		{
			searchTerm:  "@cluster=default",
			sortReverse: "0",
			showExpired: "0",
			results:     []string{silenceHostDown, silenceInstance, silenceServer7},
		},
		{
			searchTerm:  "@cluster=default",
			sortReverse: "0",
			showExpired: "1",
			results:     []string{silenceHostDown, silenceInstance, silenceServer7},
		},
		{
			searchTerm:  "@cluster=default",
			sortReverse: "1",
			showExpired: "1",
			results:     []string{silenceHostDown, silenceInstance, silenceServer7},
		},
		{
			searchTerm:  "@cluster=Default",
			sortReverse: "0",
			showExpired: "0",
			results:     []string{silenceHostDown, silenceInstance, silenceServer7},
		},
		{
			searchTerm:  "Default",
			sortReverse: "0",
			showExpired: "0",
			results:     []string{silenceHostDown, silenceInstance, silenceServer7},
		},
		{
			searchTerm:  "instance=server7",
			sortReverse: "0",
			showExpired: "0",
			results:     []string{silenceServer7},
		},
	}

	mockConfig(t.Setenv)
	for _, testCase := range silenceTestCases {
		for _, version := range mock.ListAllMocks() {
			t.Logf("Validating silences.json response using mock files from Alertmanager %s", version)
			mockAlerts(version)
			r := testRouter()
			setupRouter(r, nil)
			// re-run a few times to test the cache
			for i := 1; i <= 3; i++ {
				uri := fmt.Sprintf("/silences.json?showExpired=%s&sortReverse=%s&searchTerm=%s", testCase.showExpired, testCase.sortReverse, testCase.searchTerm)
				req := httptest.NewRequest("GET", uri, nil)
				resp := httptest.NewRecorder()
				r.ServeHTTP(resp, req)
				if resp.Code != http.StatusOK {
					t.Errorf("GET /silences.json returned status %d", resp.Code)
				}
				ur := []models.ManagedSilence{}
				body := resp.Body.Bytes()
				err := json.Unmarshal(body, &ur)
				if err != nil {
					t.Errorf("Failed to unmarshal response: %s", err)
				}
				results := []string{}
				for _, silence := range ur {
					results = append(results, silence.Silence.Comment)
				}
				sort.Strings(results) // can't rely on API order since it's sorted based on timestamps, resort
				if diff := cmp.Diff(testCase.results, results); diff != "" {
					t.Errorf("Wrong silences returned for '%s' (-want +got):\n%s", uri, diff)
				}
			}
		}
	}
}

func TestCORS(t *testing.T) {
	type corsTestCase struct {
		allowedOrigins []string
		requestOrigin  string
		result         string
	}
	corsTestCases := []corsTestCase{
		{
			allowedOrigins: []string{},
			requestOrigin:  "foo.example.com",
			result:         "foo.example.com",
		},
		{
			allowedOrigins: []string{"bar.example.com"},
			requestOrigin:  "foo.example.com",
			result:         "",
		},
		{
			allowedOrigins: []string{"bar.example.com"},
			requestOrigin:  "bar.example.com",
			result:         "bar.example.com",
		},
	}
	for _, testCase := range corsTestCases {
		mockConfig(t.Setenv)
		defer func() {
			config.Config.Listen.Cors.AllowedOrigins = nil
		}()
		config.Config.Listen.Cors.AllowedOrigins = testCase.allowedOrigins
		r := testRouter()
		setupRouter(r, nil)
		req := httptest.NewRequest("OPTIONS", "/alerts.json", nil)
		req.Header.Set("Origin", testCase.requestOrigin)
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		if resp.Header().Get("Access-Control-Allow-Origin") != testCase.result {
			t.Errorf("Invalid Access-Control-Allow-Origin value %q, expected '%q'", resp.Header().Get("Access-Control-Allow-Origin"), testCase.result)
		}
	}
}

func TestEmptySettings(t *testing.T) {
	payload, err := json.Marshal(models.AlertsRequest{
		Filters:           []string{},
		GridLimits:        map[string]int{},
		DefaultGroupLimit: 5,
	})
	if err != nil {
		t.Error(err)
		t.FailNow()
	}

	mockConfig(t.Setenv)
	r := testRouter()
	setupRouter(r, nil)
	req := httptest.NewRequest("POST", "/alerts.json", bytes.NewReader(payload))

	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusOK {
		t.Errorf("POST /alerts.json returned status %d", resp.Code)
	}
	ur := models.AlertsResponse{}
	body := resp.Body.Bytes()
	err = json.Unmarshal(body, &ur)
	if err != nil {
		t.Errorf("Failed to unmarshal response: %s", err)
	}

	expectedSettings := models.Settings{
		AnnotationsDefaultHidden: false,
		AnnotationsHidden:        []string{},
		AnnotationsVisible:       []string{},
		Sorting: models.SortSettings{
			Grid: models.GridSettings{
				Order:   "startsAt",
				Reverse: true,
				Label:   "alertname",
			},
			ValueMapping: map[string]map[string]string{},
		},
		SilenceForm: models.SilenceFormSettings{
			Strip: models.SilenceFormStripSettings{
				Labels: []string{},
			},
			DefaultAlertmanagers: []string{},
		},
		AlertAcknowledgement: models.AlertAcknowledgementSettings{
			Enabled:         false,
			DurationSeconds: 900,
			Author:          "karma",
			Comment:         "ACK! This alert was acknowledged using karma on %NOW%",
		},
		HistoryEnabled: true,
		GridGroupLimit: 40,
		Labels:         models.LabelsSettings{},
	}

	if diff := cmp.Diff(expectedSettings, ur.Settings); diff != "" {
		t.Errorf("Wrong settings returned (-want +got):\n%s", diff)
	}
}

func TestAuthentication(t *testing.T) {
	type authTest struct {
		name                     string
		headerName               string
		headerRe                 string
		groupName                string
		groupRe                  string
		groupSeparator           string
		basicAuthUsers           []config.AuthenticationUser
		requestHeaders           map[string]string
		requestBasicAuthUser     string
		requestBasicAuthPassword string
		responseCode             int
		responseUsername         string
		responseGroups           []string
	}

	authTests := []authTest{
		{
			name: "basic auth, request without credentials, 401",
			basicAuthUsers: []config.AuthenticationUser{
				{Username: "john", Password: "foobar"},
			},
			responseCode: 401,
		},
		{
			name: "basic auth, request with empty Authorization header, 401",
			basicAuthUsers: []config.AuthenticationUser{
				{Username: "john", Password: "foobar"},
			},
			requestHeaders: map[string]string{"Authorization": ""},
			responseCode:   401,
		},
		{
			name: "basic auth, missing password, 401",
			basicAuthUsers: []config.AuthenticationUser{
				{Username: "john", Password: "foobar"},
			},
			requestBasicAuthUser: "john",
			responseCode:         401,
		},
		{
			name: "basic auth, missing username, 401",
			basicAuthUsers: []config.AuthenticationUser{
				{Username: "john", Password: "foobar"},
			},
			requestBasicAuthPassword: "foobar",
			responseCode:             401,
		},
		{
			name: "basic auth, wrong password, 401",
			basicAuthUsers: []config.AuthenticationUser{
				{Username: "john", Password: "foobar"},
			},
			requestBasicAuthUser:     "john",
			requestBasicAuthPassword: "foobarx",
			responseCode:             401,
		},
		{
			name: "basic auth, wrong user, 401",
			basicAuthUsers: []config.AuthenticationUser{
				{Username: "john", Password: "foobar"},
			},
			requestBasicAuthUser:     "johnx",
			requestBasicAuthPassword: "foobar",
			responseCode:             401,
		},
		{
			name: "basic auth, correct credentials, 200",
			basicAuthUsers: []config.AuthenticationUser{
				{Username: "john", Password: "foobar"},
			},
			requestBasicAuthUser:     "john",
			requestBasicAuthPassword: "foobar",
			responseCode:             200,
			responseUsername:         "john",
			responseGroups:           []string{},
		},
		{
			name:         "header auth, missing header, 401",
			headerName:   "X-Auth",
			headerRe:     "(.+)",
			responseCode: 401,
		},
		{
			name:       "header auth, header value doesn't match, 401",
			headerName: "X-Auth",
			headerRe:   "Username (.+)",
			requestHeaders: map[string]string{
				"X-Auth": "xxx",
			},
			responseCode: 401,
		},
		{
			name:       "header auth, header value doesn't match #2, 401",
			headerName: "X-Auth",
			headerRe:   "Username (.+)",
			requestHeaders: map[string]string{
				"X-Auth": "xxx Username xxx",
			},
			responseCode: 401,
		},
		{
			name:       "header auth, header correct, 200",
			headerName: "X-Auth",
			headerRe:   "(.+)",
			requestHeaders: map[string]string{
				"X-Auth": "john",
			},
			responseCode:     200,
			responseUsername: "john",
			responseGroups:   []string{},
		},
		{
			name:       "header auth, header correct #2, 200",
			headerName: "X-Auth",
			headerRe:   "Username (.+)",
			requestHeaders: map[string]string{
				"X-Auth": "Username john",
			},
			responseCode:     200,
			responseUsername: "john",
			responseGroups:   []string{},
		},
		{
			name:           "header auth, no groups, 200",
			headerName:     "X-Auth",
			headerRe:       "Username (.+)",
			groupName:      "X-Auth-Groups",
			groupRe:        "(.+)",
			groupSeparator: ",",
			requestHeaders: map[string]string{
				"X-Auth": "Username john",
			},
			responseCode:     200,
			responseUsername: "john",
			responseGroups:   []string{},
		},
		{
			name:           "header auth, group present, 200",
			headerName:     "X-Auth",
			headerRe:       "Username (.+)",
			groupName:      "X-Auth-Groups",
			groupRe:        "(.+)",
			groupSeparator: ",",
			requestHeaders: map[string]string{
				"X-Auth":        "Username john",
				"X-Auth-Groups": "foo",
			},
			responseCode:     200,
			responseUsername: "john",
			responseGroups:   []string{"foo"},
		},
		{
			name:           "header auth, unmatched groups, 200",
			headerName:     "X-Auth",
			headerRe:       "Username (.+)",
			groupName:      "X-Auth-Groups",
			groupRe:        "Groups: (.+)",
			groupSeparator: ",",
			requestHeaders: map[string]string{
				"X-Auth":        "Username john",
				"X-Auth-Groups": "foo",
			},
			responseCode:     200,
			responseUsername: "john",
			responseGroups:   []string{},
		},
		{
			name:           "header auth, empty groups, 200",
			headerName:     "X-Auth",
			headerRe:       "Username (.+)",
			groupName:      "X-Auth-Groups",
			groupRe:        "Groups: (.+)",
			groupSeparator: ",",
			requestHeaders: map[string]string{
				"X-Auth":        "Username john",
				"X-Auth-Groups": "Groups:",
			},
			responseCode:     200,
			responseUsername: "john",
			responseGroups:   []string{},
		},
		{
			name:           "header auth, empty groups with spaces, 200",
			headerName:     "X-Auth",
			headerRe:       "Username (.+)",
			groupName:      "X-Auth-Groups",
			groupRe:        "Groups: (.+)",
			groupSeparator: ",",
			requestHeaders: map[string]string{
				"X-Auth":        "Username john",
				"X-Auth-Groups": "Groups:    ",
			},
			responseCode:     200,
			responseUsername: "john",
			responseGroups:   []string{},
		},
		{
			name:           "header auth, multiple groups, 200",
			headerName:     "X-Auth",
			headerRe:       "Username (.+)",
			groupName:      "X-Auth-Groups",
			groupRe:        "(.+)",
			groupSeparator: ",",
			requestHeaders: map[string]string{
				"X-Auth":        "Username john",
				"X-Auth-Groups": "foo,bar, baz baz   ",
			},
			responseCode:     200,
			responseUsername: "john",
			responseGroups:   []string{"foo", "bar", "baz baz"},
		},
		{
			name:           "header auth, multiple groups separated by spaces, 200",
			headerName:     "X-Auth",
			headerRe:       "Username (.+)",
			groupName:      "X-Auth-Groups",
			groupRe:        "(.+)",
			groupSeparator: " ",
			requestHeaders: map[string]string{
				"X-Auth":        "Username john",
				"X-Auth-Groups": "foo bar baz baz   ",
			},
			responseCode:     200,
			responseUsername: "john",
			responseGroups:   []string{"foo", "bar", "baz", "baz"},
		},
		{
			name:           "header auth, only groups enabled, no basic auth, 200",
			groupName:      "X-Auth-Groups",
			groupRe:        "(.+)",
			groupSeparator: " ",
			requestHeaders: map[string]string{
				"X-Auth":        "Username john",
				"X-Auth-Groups": "foo",
			},
			responseCode:     200,
			responseUsername: "",
			responseGroups:   []string{},
		},
		{
			name: "header auth, only groups enabled, basic auth, 200",
			basicAuthUsers: []config.AuthenticationUser{
				{Username: "john", Password: "foobar"},
			},
			requestBasicAuthUser:     "john",
			requestBasicAuthPassword: "foobar",
			groupName:                "X-Auth-Groups",
			groupRe:                  "Groups (.+)",
			groupSeparator:           " ",
			requestHeaders: map[string]string{
				"X-Auth-Groups": "Groups foo bar",
			},
			responseCode:     200,
			responseUsername: "john",
			responseGroups:   []string{"foo", "bar"},
		},
	}

	zerolog.SetGlobalLevel(zerolog.FatalLevel)
	for _, testCase := range authTests {
		t.Run(testCase.name, func(t *testing.T) {
			config.Config.Authentication.Header.Name = testCase.headerName
			config.Config.Authentication.Header.ValueRegex = testCase.headerRe
			config.Config.Authentication.Header.GroupName = testCase.groupName
			config.Config.Authentication.Header.GroupValueRegex = testCase.groupRe
			config.Config.Authentication.Header.GroupValueSeparator = testCase.groupSeparator
			config.Config.Authentication.BasicAuth.Users = testCase.basicAuthUsers
			r := testRouter()
			setupRouter(r, nil)
			mockCache()
			for _, path := range []string{
				"/",
				"/alerts.json",
				"/alertList.json",
				"/autocomplete.json?term=foo",
				"/labelNames.json",
				"/labelValues.json?name=foo",
				"/silences.json",
				"/custom.css",
				"/custom.js",
				"/health",
				"/health?foo",
				"/metrics",
				"/metrics?bar=foo",
			} {
				method := "GET"
				var body io.Reader
				if path == "/alerts.json" {
					method = "POST"
					payload, err := json.Marshal(models.AlertsRequest{
						Filters:           []string{},
						GridLimits:        map[string]int{},
						DefaultGroupLimit: 50,
					})
					if err != nil {
						t.Error(err)
						t.FailNow()
					}
					body = bytes.NewReader(payload)
				}

				req := httptest.NewRequest(method, path, body)
				for k, v := range testCase.requestHeaders {
					req.Header.Set(k, v)
				}
				req.SetBasicAuth(testCase.requestBasicAuthUser, testCase.requestBasicAuthPassword)
				resp := httptest.NewRecorder()
				r.ServeHTTP(resp, req)

				if strings.HasPrefix(path, "/health") || strings.HasPrefix(path, "/metrics") {
					if resp.Code != 200 {
						t.Errorf("%s should always return 200, got %d", path, resp.Code)
					}
					continue
				}

				if resp.Code != testCase.responseCode {
					t.Errorf("Expected %d from %s, got %d", testCase.responseCode, path, resp.Code)
				}

				if resp.Code == 200 && path == "/alerts.json" {
					ur := models.AlertsResponse{}
					err := json.Unmarshal(resp.Body.Bytes(), &ur)
					if err != nil {
						t.Errorf("Failed to unmarshal response: %s", err)
					}
					if ur.Authentication.Enabled != true {
						t.Errorf("Got Authentication.Enabled=%v", ur.Authentication.Enabled)
					}
					if ur.Authentication.Username != testCase.responseUsername {
						t.Errorf("Got Authentication.Username=%s, expected %s", ur.Authentication.Username, testCase.responseUsername)
					}
					if diff := cmp.Diff(ur.Authentication.Groups, testCase.responseGroups); diff != "" {
						t.Errorf("Incorrect groups list (-want +got):\n%s", diff)
						break
					}
				}
			}
		})
	}
}

func TestInvalidBasicAuthHeader(t *testing.T) {
	config.Config.Authentication.Header.Name = ""
	config.Config.Authentication.Header.ValueRegex = ""
	config.Config.Authentication.BasicAuth.Users = []config.AuthenticationUser{
		{Username: "john", Password: "foobar"},
	}
	r := testRouter()
	setupRouter(r, nil)
	mockCache()
	for _, path := range []string{
		"/",
		"/alertList.json",
		"/autocomplete.json?term=foo",
		"/labelNames.json",
		"/labelValues.json?name=foo",
		"/silences.json",
		"/custom.css",
		"/custom.js",
	} {
		req := httptest.NewRequest("GET", path, nil)
		req.Header.Set("Authorization", "")
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != 401 {
			t.Errorf("Expected 401 from %s, got %d", path, resp.Code)
		}
	}
}

func TestGetUserFromContextMissing(t *testing.T) {
	payload, err := json.Marshal(models.AlertsRequest{
		Filters:           []string{},
		GridLimits:        map[string]int{},
		DefaultGroupLimit: 5,
	})
	if err != nil {
		t.Error(err)
		t.FailNow()
	}
	req := httptest.NewRequest("POST", "/alerts.json", bytes.NewReader(payload))
	user := getUserFromContext(req)
	if user != "" {
		t.Errorf("getUserFromContext() returned user=%q", user)
	}
}

func TestGetUserFromContextPresent(t *testing.T) {
	payload, err := json.Marshal(models.AlertsRequest{
		Filters:           []string{},
		GridLimits:        map[string]int{},
		DefaultGroupLimit: 5,
	})
	if err != nil {
		t.Error(err)
		t.FailNow()
	}
	req := httptest.NewRequest("POST", "/alerts.json", bytes.NewReader(payload))
	ctx := context.WithValue(req.Context(), authUserKey("user"), "bob")
	user := getUserFromContext(req.WithContext(ctx))
	if user == "" {
		t.Errorf("getUserFromContext() returned user=%q", user)
	}
}

func TestHealthcheckAlerts(t *testing.T) {
	type testCaseT struct {
		healthchecks map[string][]string
		visible      bool
		hasError     bool
	}

	testCases := []testCaseT{
		{
			healthchecks: map[string][]string{},
			hasError:     false,
		},
		{
			healthchecks: map[string][]string{
				"active": {"alertname=Host_Down"},
			},
			hasError: false,
		},
		{
			healthchecks: map[string][]string{
				"active": {"alertname=Host_Down"},
			},
			visible:  true,
			hasError: false,
		},
		{
			healthchecks: map[string][]string{
				"active": {
					"alertname=Host_Down",
					"cluster=staging",
				},
			},
			hasError: false,
		},
		{
			healthchecks: map[string][]string{
				"active": {"alertname=FooBar"},
			},
			hasError: true,
		},
		{
			healthchecks: map[string][]string{
				"active": {
					"alertname=Host_Down",
					"cluster=unknown",
				},
			},
			hasError: true,
		},
	}

	zerolog.SetGlobalLevel(zerolog.FatalLevel)
	for i, testCase := range testCases {
		for _, version := range mock.ListAllMocks() {
			t.Run(fmt.Sprintf("%d/%s", i, version), func(t *testing.T) {
				httpmock.Activate()
				defer httpmock.DeactivateAndReset()
				mockCache()
				mock.RegisterURL("http://localhost/metrics", version, "metrics")
				mock.RegisterURL("http://localhost/api/v2/silences", version, "api/v2/silences")
				mock.RegisterURL("http://localhost/api/v2/alerts/groups", version, "api/v2/alerts/groups")

				am, err := alertmanager.NewAlertmanager(
					"cluster",
					"healthchecks",
					"http://localhost",
					alertmanager.WithHealthchecks(testCase.healthchecks),
					alertmanager.WithHealthchecksVisible(testCase.visible),
				)
				if err != nil {
					t.Error(err)
					return
				}

				alertmanager.UnregisterAll()
				upstreamSetup = false
				err = alertmanager.RegisterAlertmanager(am)
				if err != nil {
					t.Error(err)
					return
				}

				_ = am.Pull(intern.New())
				hasError := am.Error() != ""
				if hasError != testCase.hasError {
					t.Errorf("error=%q expected=%v", am.Error(), testCase.hasError)
				}

				alertGroups := alertmanager.DedupAlerts()
				for _, ag := range alertGroups {
					for _, alert := range ag.Alerts {
						alert := alert
						name, hc := am.IsHealthCheckAlert(&alert)
						if hc != nil && !testCase.visible {
							t.Errorf("%s visible=%v but got hc alert %v", name, testCase.visible, alert)
						}
					}
				}
			})
		}
	}
}

func TestAlertFilters(t *testing.T) {
	type testCaseT struct {
		filters    []string
		alertCount int
	}

	testCases := []testCaseT{
		{
			filters:    []string{},
			alertCount: 24,
		},
		{
			filters:    []string{"@alertmanager=xxx"},
			alertCount: 0,
		},
		{
			filters:    []string{"@alertmanager=c1a"},
			alertCount: 24,
		},
		{
			filters:    []string{"@cluster=cluster1"},
			alertCount: 24,
		},
		{
			filters:    []string{"@cluster=cluster2"},
			alertCount: 24,
		},
	}

	for _, tc := range testCases {
		var filters []string
		for _, f := range tc.filters {
			filters = append(filters, "q="+f)
		}
		q := strings.Join(filters, "&")
		for _, version := range mock.ListAllMocks() {
			t.Run(q, func(t *testing.T) {
				t.Logf("Validating alerts.json response using mock files from Alertmanager %s", version)

				httpmock.Reset()
				httpmock.Activate()
				defer httpmock.DeactivateAndReset()

				config.Config.Listen.Prefix = "/"
				config.Config.Authentication.Header.Name = ""
				config.Config.Authentication.BasicAuth.Users = []config.AuthenticationUser{}

				mockCache()

				alertmanager.UnregisterAll()
				upstreamSetup = false

				mock.RegisterURL("http://localhost/c1a/metrics", version, "metrics")
				mock.RegisterURL("http://localhost/c1a/api/v2/silences", version, "api/v2/silences")
				mock.RegisterURL("http://localhost/c1a/api/v2/alerts/groups", version, "api/v2/alerts/groups")
				c1a, err := alertmanager.NewAlertmanager("cluster1", "c1a", "http://localhost/c1a")
				if err != nil {
					t.Fatal(err)
				}
				err = alertmanager.RegisterAlertmanager(c1a)
				if err != nil {
					t.Fatal(err)
				}

				mock.RegisterURL("http://localhost/c1b/metrics", version, "metrics")
				mock.RegisterURL("http://localhost/c1b/api/v2/silences", version, "api/v2/silences")
				mock.RegisterURL("http://localhost/c1b/api/v2/alerts/groups", version, "api/v2/alerts/groups")
				c1b, err := alertmanager.NewAlertmanager("cluster1", "c1b", "http://localhost/c1b")
				if err != nil {
					t.Fatal(err)
				}
				err = alertmanager.RegisterAlertmanager(c1b)
				if err != nil {
					t.Fatal(err)
				}

				mock.RegisterURL("http://localhost/c2a/metrics", version, "metrics")
				mock.RegisterURL("http://localhost/c2a/api/v2/silences", version, "api/v2/silences")
				mock.RegisterURL("http://localhost/c2a/api/v2/alerts/groups", version, "api/v2/alerts/groups")
				c2a, err := alertmanager.NewAlertmanager("cluster2", "c2a", "http://localhost/c2a")
				if err != nil {
					t.Fatal(err)
				}
				err = alertmanager.RegisterAlertmanager(c2a)
				if err != nil {
					t.Fatal(err)
				}

				pullFromAlertmanager()

				payload, err := json.Marshal(models.AlertsRequest{
					Filters:           tc.filters,
					GridLimits:        map[string]int{},
					DefaultGroupLimit: 5,
				})
				if err != nil {
					t.Error(err)
					t.FailNow()
				}

				r := testRouter()
				setupRouter(r, nil)
				// re-run a few times to test the cache
				for i := 1; i <= 3; i++ {
					req := httptest.NewRequest("POST", "/alerts.json", bytes.NewReader(payload))
					resp := httptest.NewRecorder()
					r.ServeHTTP(resp, req)
					if resp.Code != http.StatusOK {
						t.Errorf("POST /alerts.json returned status %d", resp.Code)
					}
					ur := models.AlertsResponse{}
					body := resp.Body.Bytes()
					err := json.Unmarshal(body, &ur)
					if err != nil {
						t.Errorf("Failed to unmarshal response: %s", err)
					}
					if ur.TotalAlerts != tc.alertCount {
						t.Errorf("Got %d alerts, expected %d", ur.TotalAlerts, tc.alertCount)
					}
				}

				alertmanager.UnregisterAll()
				upstreamSetup = false
			})
		}
	}
}

type gzErrWriter struct {
	failWrite bool
	failClose bool
}

func (ew *gzErrWriter) Write(p []byte) (n int, err error) {
	if ew.failWrite {
		return 0, errors.New("Write error")
	}
	return len(p), nil
}

func (ew *gzErrWriter) Close() error {
	if ew.failClose {
		return errors.New("Close error")
	}
	return nil
}

func TestCompressResponseWriteError(t *testing.T) {
	_, err := compressResponse(nil, &gzErrWriter{failWrite: true})
	if err == nil {
		t.Error("compressResponse() didn't return any error")
	}
}

func TestCompressResponseCloseError(t *testing.T) {
	_, err := compressResponse(nil, &gzErrWriter{failClose: true})
	if err == nil {
		t.Error("compressResponse() didn't return any error")
	}
}

type gzErrReader struct {
	failAfter int
	reads     int
}

func (er *gzErrReader) Read(p []byte) (n int, err error) {
	if er.reads >= er.failAfter {
		return 0, errors.New("Read error")
	}
	er.reads++

	b, err := compressResponse([]byte("abcd"), nil)
	if err != nil {
		return 0, err
	}

	return bytes.NewReader(b).Read(p)
}

func TestDecompressResponseResetError(t *testing.T) {
	_, err := decompressCachedResponse(&gzErrReader{failAfter: 0})
	if err == nil {
		t.Error("decompressCachedResponse() didn't return any error")
		return
	}
	if err.Error() != "failed to created new compression reader: Read error" {
		t.Errorf("decompressCachedResponse() returned wrong error: %s", err)
	}
}

func TestDecompressResponseReadError(t *testing.T) {
	_, err := decompressCachedResponse(&gzErrReader{failAfter: 1})
	if err == nil {
		t.Error("decompressCachedResponse() didn't return any error")
		return
	}
	if err.Error() != "failed to decompress data: Read error" {
		t.Errorf("decompressCachedResponse() returned wrong error: %s", err)
	}
}

func TestAutoGrid(t *testing.T) {
	type testCaseT struct {
		request   models.AlertsRequest
		gridLabel string
		ignore    []string
		order     []string
	}

	testCases := []testCaseT{
		{
			request: models.AlertsRequest{
				Filters:           []string{},
				GridLimits:        map[string]int{},
				GridLabel:         "",
				DefaultGroupLimit: 5,
			},
			gridLabel: "",
		},
		{
			request: models.AlertsRequest{
				Filters:           []string{},
				GridLimits:        map[string]int{},
				GridLabel:         "@auto",
				DefaultGroupLimit: 5,
			},
			gridLabel: "job",
		},
		{
			request: models.AlertsRequest{
				Filters:           []string{"cluster!=prod"},
				GridLimits:        map[string]int{},
				GridLabel:         "@auto",
				DefaultGroupLimit: 5,
			},
			gridLabel: "cluster",
			ignore:    []string{"job"},
			order:     []string{"cluster"},
		},
		{
			request: models.AlertsRequest{
				Filters:           []string{"cluster!=prod"},
				GridLimits:        map[string]int{},
				GridLabel:         "@auto",
				DefaultGroupLimit: 5,
			},
			gridLabel: "cluster",
			ignore:    []string{},
			order:     []string{"cluster"},
		},
		{
			request: models.AlertsRequest{
				Filters:           []string{"cluster!=prod"},
				GridLimits:        map[string]int{},
				GridLabel:         "@auto",
				DefaultGroupLimit: 5,
			}, gridLabel: "job",
			ignore: []string{},
			order:  []string{"job", "cluster"},
		},
		{
			request: models.AlertsRequest{
				Filters:           []string{"job=node_exporter"},
				GridLimits:        map[string]int{},
				GridLabel:         "@auto",
				DefaultGroupLimit: 5,
			},
			gridLabel: "cluster",
			ignore:    []string{},
			order:     []string{"job", "cluster"},
		},
		{
			request: models.AlertsRequest{
				Filters:           []string{"cluster!=dev"},
				GridLimits:        map[string]int{},
				GridLabel:         "@auto",
				DefaultGroupLimit: 5,
			},
			gridLabel: "job",
			ignore:    []string{},
			order:     []string{"job", "cluster"},
		},
		{
			request: models.AlertsRequest{
				Filters:           []string{"cluster=dev"},
				GridLimits:        map[string]int{},
				GridLabel:         "@auto",
				DefaultGroupLimit: 5,
			},
			gridLabel: "alertname",
			ignore:    []string{},
			order:     []string{},
		},
		{
			request: models.AlertsRequest{
				Filters:           []string{},
				GridLimits:        map[string]int{},
				GridLabel:         "job",
				DefaultGroupLimit: 5,
			},
			gridLabel: "job",
		},
		{
			request: models.AlertsRequest{
				Filters:           []string{"instance=server5"},
				GridLimits:        map[string]int{},
				GridLabel:         "@auto",
				DefaultGroupLimit: 5,
			},
			gridLabel: "job",
			ignore:    []string{"alertname"},
		},
		{
			request: models.AlertsRequest{
				Filters:           []string{"job=node_exporter"},
				GridLimits:        map[string]int{},
				GridLabel:         "@auto",
				DefaultGroupLimit: 5,
			},
			gridLabel: "cluster",
			ignore:    []string{"alertname"},
		},
		{
			request: models.AlertsRequest{
				Filters:           []string{"cluster=prod"},
				GridLimits:        map[string]int{},
				GridLabel:         "@auto",
				DefaultGroupLimit: 5,
			},
			gridLabel: "job",
			ignore:    []string{"alertname", "instance"},
		},
	}

	defer func() {
		config.Config.Grid.Auto.Ignore = []string{}
		config.Config.Grid.Auto.Order = []string{}
	}()

	mockConfig(t.Setenv)
	for _, tc := range testCases {
		config.Config.Grid.Auto.Ignore = tc.ignore
		config.Config.Grid.Auto.Order = tc.order
		payload, err := json.Marshal(tc.request)
		if err != nil {
			t.Error(err)
			t.FailNow()
		}
		for i, version := range mock.ListAllMocks() {
			t.Logf("Testing alerts using mock files from Alertmanager %s", version)
			mockAlerts(version)
			r := testRouter()
			setupRouter(r, nil)
			// re-run a few times to test the cache
			for j := 1; j <= 3; j++ {
				req := httptest.NewRequest("POST", "/alerts.json", bytes.NewReader(payload))
				resp := httptest.NewRecorder()
				r.ServeHTTP(resp, req)
				if resp.Code != http.StatusOK {
					t.Errorf("POST /alerts.json returned status %d", resp.Code)
					t.FailNow()
				}

				ur := models.AlertsResponse{}
				err := json.Unmarshal(resp.Body.Bytes(), &ur)
				if err != nil {
					t.Errorf("Failed to unmarshal response: %s", err)
					t.FailNow()
				}
				if len(ur.Grids) == 0 {
					t.Errorf("[%d] Got empty grid list", i)
					t.FailNow()
				}
				for _, g := range ur.Grids {
					if g.LabelName != tc.gridLabel {
						t.Errorf("[%d] Got grid using label %s=%s, expected %s", i, g.LabelName, g.LabelValue, tc.gridLabel)
					}
				}
			}
		}
	}
}

func TestGridLimit(t *testing.T) {
	type testCaseT struct {
		groupLimit int
		request    models.AlertsRequest
		groups     map[string][]int
	}
	testCases := []testCaseT{
		{
			request: models.AlertsRequest{
				Filters:           []string{},
				GridLimits:        map[string]int{},
				DefaultGroupLimit: 5,
			},
			groups: map[string][]int{
				"": {10, 10},
			},
		},
		{
			groupLimit: 5,
			request: models.AlertsRequest{
				Filters:           []string{},
				GridLimits:        map[string]int{},
				DefaultGroupLimit: 5,
			},
			groups: map[string][]int{
				"": {10, 5},
			},
		},
		{
			groupLimit: 15,
			request: models.AlertsRequest{
				Filters:           []string{},
				GridLimits:        map[string]int{},
				DefaultGroupLimit: 5,
			},
			groups: map[string][]int{
				"": {10, 10},
			},
		},
		{
			request: models.AlertsRequest{
				Filters:   []string{},
				GridLabel: "job",
				GridLimits: map[string]int{
					"node_exporter": 1,
				},
				DefaultGroupLimit: 5,
			},
			groups: map[string][]int{
				"node_exporter": {6, 1},
				"node_ping":     {4, 4},
			},
		},
		{
			request: models.AlertsRequest{
				Filters:   []string{},
				GridLabel: "job",
				GridLimits: map[string]int{
					"node_exporter": 10,
					"node_ping":     1,
				},
				DefaultGroupLimit: 5,
			},
			groups: map[string][]int{
				"node_exporter": {6, 6},
				"node_ping":     {4, 1},
			},
		},
		{
			request: models.AlertsRequest{
				Filters:   []string{},
				GridLabel: "job",
				GridLimits: map[string]int{
					"node_exporter": 0,
					"node_ping":     2,
				},
				DefaultGroupLimit: 5,
			},
			groups: map[string][]int{
				"node_exporter": {6, 1},
				"node_ping":     {4, 2},
			},
		},
		{
			request: models.AlertsRequest{
				Filters:   []string{},
				GridLabel: "job",
				GridLimits: map[string]int{
					"node_exporter": 0,
					"node_ping":     20,
				},
				DefaultGroupLimit: 5,
			},
			groups: map[string][]int{
				"node_exporter": {6, 1},
				"node_ping":     {4, 4},
			},
		},
	}

	defer func() {
		config.Config.Grid.GroupLimit = 50
	}()

	mockConfig(t.Setenv)
	for _, tc := range testCases {
		if tc.groupLimit > 0 {
			config.Config.Grid.GroupLimit = tc.groupLimit
		} else {
			config.Config.Grid.GroupLimit = 50
		}
		payload, err := json.Marshal(tc.request)
		if err != nil {
			t.Error(err)
			t.FailNow()
		}
		for i, version := range mock.ListAllMocks() {
			t.Logf("Testing grids using mock files from Alertmanager %s", version)
			mockAlerts(version)
			r := testRouter()
			setupRouter(r, nil)
			// re-run a few times to test the cache
			for j := 1; j <= 3; j++ {
				req := httptest.NewRequest("POST", "/alerts.json", bytes.NewReader(payload))
				resp := httptest.NewRecorder()
				r.ServeHTTP(resp, req)
				if resp.Code != http.StatusOK {
					t.Errorf("GET /alerts.json returned status %d", resp.Code)
				}

				ur := models.AlertsResponse{}
				err := json.Unmarshal(resp.Body.Bytes(), &ur)
				if err != nil {
					t.Errorf("Failed to unmarshal response: %s", err)
				}
				if len(ur.Grids) == 0 {
					t.Errorf("[%d] Got empty grid list", i)
				}
				for _, grid := range ur.Grids {
					if grid.TotalGroups == 0 {
						t.Errorf("[%d] got empty grid for %s=%s", i, grid.LabelName, grid.LabelValue)
					}
					found := false
					for labelValue := range tc.groups {
						if grid.LabelValue == labelValue {
							found = true
							break
						}
					}
					if !found {
						t.Errorf("[%d] got extra grid %s=%s", i, grid.LabelName, grid.LabelValue)
					}
				}
				for labelValue, totals := range tc.groups {
					totalGroups := totals[0]
					presentGroups := totals[1]
					found := false
					for _, grid := range ur.Grids {
						if grid.LabelValue == labelValue {
							found = true
							if grid.TotalGroups != totalGroups {
								t.Errorf("[%d] grid for label %s=%s returned totalGroups=%d, expected %d", i, grid.LabelName, grid.LabelValue, grid.TotalGroups, totalGroups)
							}
							if len(grid.AlertGroups) != presentGroups {
								t.Errorf("[%d] grid for label %s=%s returned %d alert groups, expected %d", i, grid.LabelName, grid.LabelValue, len(grid.AlertGroups), presentGroups)
							}
							break
						}
					}
					if !found {
						t.Errorf("[%d] grid with label value %s missing", i, labelValue)
					}
				}
			}
		}
	}
}

func TestAlertList(t *testing.T) {
	type testCaseT struct {
		args   string
		alerts AlertList
	}

	testCases := []testCaseT{
		{
			args: "",
			alerts: AlertList{
				Alerts: []models.Labels{
					{
						{Name: "alertname", Value: "Free_Disk_Space_Too_Low"},
						{Name: "cluster", Value: "staging"},
						{Name: "disk", Value: "sda"},
						{Name: "instance", Value: "server5"},
						{Name: "job", Value: "node_exporter"},
					},
					{
						{Name: "alertname", Value: "HTTP_Probe_Failed"},
						{Name: "cluster", Value: "dev"},
						{Name: "instance", Value: "web1"},
						{Name: "job", Value: "node_exporter"},
					},
					{
						{Name: "alertname", Value: "HTTP_Probe_Failed"},
						{Name: "cluster", Value: "dev"},
						{Name: "instance", Value: "web2"},
						{Name: "job", Value: "node_exporter"},
					},
					{
						{Name: "alertname", Value: "Host_Down"},
						{Name: "cluster", Value: "dev"},
						{Name: "instance", Value: "server6"},
						{Name: "ip", Value: "127.0.0.6"},
						{Name: "job", Value: "node_ping"},
					},
					{
						{Name: "alertname", Value: "Host_Down"},
						{Name: "cluster", Value: "dev"},
						{Name: "instance", Value: "server7"},
						{Name: "ip", Value: "127.0.0.7"},
						{Name: "job", Value: "node_ping"},
					},
					{
						{Name: "alertname", Value: "Host_Down"},
						{Name: "cluster", Value: "dev"},
						{Name: "instance", Value: "server8"},
						{Name: "ip", Value: "127.0.0.8"},
						{Name: "job", Value: "node_ping"},
					},
					{
						{Name: "alertname", Value: "Host_Down"},
						{Name: "cluster", Value: "prod"},
						{Name: "instance", Value: "server1"},
						{Name: "ip", Value: "127.0.0.1"},
						{Name: "job", Value: "node_ping"},
					},
					{
						{Name: "alertname", Value: "Host_Down"},
						{Name: "cluster", Value: "prod"},
						{Name: "instance", Value: "server2"},
						{Name: "ip", Value: "127.0.0.2"},
						{Name: "job", Value: "node_ping"},
					},
					{
						{Name: "alertname", Value: "Host_Down"},
						{Name: "cluster", Value: "staging"},
						{Name: "instance", Value: "server3"},
						{Name: "ip", Value: "127.0.0.3"},
						{Name: "job", Value: "node_ping"},
					},
					{
						{Name: "alertname", Value: "Host_Down"},
						{Name: "cluster", Value: "staging"},
						{Name: "instance", Value: "server4"},
						{Name: "ip", Value: "127.0.0.4"},
						{Name: "job", Value: "node_ping"},
					},
					{
						{Name: "alertname", Value: "Host_Down"},
						{Name: "cluster", Value: "staging"},
						{Name: "instance", Value: "server5"},
						{Name: "ip", Value: "127.0.0.5"},
						{Name: "job", Value: "node_ping"},
					},
					{
						{Name: "alertname", Value: "Memory_Usage_Too_High"},
						{Name: "cluster", Value: "prod"},
						{Name: "instance", Value: "server2"},
						{Name: "job", Value: "node_exporter"},
					},
				},
			},
		},
		{
			args: "q=alertname=Free_Disk_Space_Too_Low",
			alerts: AlertList{
				Alerts: []models.Labels{
					{
						{Name: "alertname", Value: "Free_Disk_Space_Too_Low"},
						{Name: "cluster", Value: "staging"},
						{Name: "disk", Value: "sda"},
						{Name: "instance", Value: "server5"},
						{Name: "job", Value: "node_exporter"},
					},
				},
			},
		},
		{
			args: "q=alertname=HTTP_Probe_Failed",
			alerts: AlertList{
				Alerts: []models.Labels{
					{
						{Name: "alertname", Value: "HTTP_Probe_Failed"},
						{Name: "cluster", Value: "dev"},
						{Name: "instance", Value: "web1"},
						{Name: "job", Value: "node_exporter"},
					},
					{
						{Name: "alertname", Value: "HTTP_Probe_Failed"},
						{Name: "cluster", Value: "dev"},
						{Name: "instance", Value: "web2"},
						{Name: "job", Value: "node_exporter"},
					},
				},
			},
		},
		{
			args: "q=instance=server2",
			alerts: AlertList{
				Alerts: []models.Labels{
					{
						{Name: "alertname", Value: "Host_Down"},
						{Name: "cluster", Value: "prod"},
						{Name: "instance", Value: "server2"},
						{Name: "ip", Value: "127.0.0.2"},
						{Name: "job", Value: "node_ping"},
					},
					{
						{Name: "alertname", Value: "Memory_Usage_Too_High"},
						{Name: "cluster", Value: "prod"},
						{Name: "instance", Value: "server2"},
						{Name: "job", Value: "node_exporter"},
					},
				},
			},
		},
		{
			args: "q=alertname=Host_Down&q=cluster=prod",
			alerts: AlertList{
				Alerts: []models.Labels{
					{
						{Name: "alertname", Value: "Host_Down"},
						{Name: "cluster", Value: "prod"},
						{Name: "instance", Value: "server1"},
						{Name: "ip", Value: "127.0.0.1"},
						{Name: "job", Value: "node_ping"},
					},
					{
						{Name: "alertname", Value: "Host_Down"},
						{Name: "cluster", Value: "prod"},
						{Name: "instance", Value: "server2"},
						{Name: "ip", Value: "127.0.0.2"},
						{Name: "job", Value: "node_ping"},
					},
				},
			},
		},
		{
			args: "q=foo=bar",
			alerts: AlertList{
				Alerts: []models.Labels{},
			},
		},
	}

	mockConfig(t.Setenv)
	for _, tc := range testCases {
		for _, version := range mock.ListAllMocks() {
			t.Run(fmt.Sprintf("%s:%s", version, tc.args), func(t *testing.T) {
				t.Logf("Testing alerts using mock files from Alertmanager %s", version)
				mockAlerts(version)
				r := testRouter()
				setupRouter(r, nil)
				// re-run a few times to test the cache
				for i := 1; i <= 3; i++ {
					req := httptest.NewRequest("GET", "/alertList.json?"+tc.args, nil)
					resp := httptest.NewRecorder()
					r.ServeHTTP(resp, req)
					if resp.Code != http.StatusOK {
						t.Errorf("GET /alertList.json returned status %d", resp.Code)
					}

					ur := AlertList{}
					err := json.Unmarshal(resp.Body.Bytes(), &ur)
					if err != nil {
						t.Errorf("Failed to unmarshal response: %s", err)
					}
					if diff := cmp.Diff(tc.alerts, ur); diff != "" {
						t.Errorf("Wrong alert list returned (-want +got):\n%s", diff)
					}
				}
			})
			break
		}
	}
}

func TestSortSliceOfLabels(t *testing.T) {
	type testCaseT struct {
		labels   []models.Labels
		sortKeys []string
		fallback string
		output   []models.Labels
	}

	testCases := []testCaseT{
		{
			labels: []models.Labels{
				{{Name: "alertname", Value: "alert2"}},
				{{Name: "alertname", Value: "alert1"}},
			},
			sortKeys: []string{},
			fallback: "",
			output: []models.Labels{
				{{Name: "alertname", Value: "alert2"}},
				{{Name: "alertname", Value: "alert1"}},
			},
		},
		{
			labels: []models.Labels{
				{{Name: "alertname", Value: "alert2"}},
				{{Name: "alertname", Value: "alert1"}},
			},
			sortKeys: []string{"alertname"},
			fallback: "alertname",
			output: []models.Labels{
				{{Name: "alertname", Value: "alert1"}},
				{{Name: "alertname", Value: "alert2"}},
			},
		},
		{
			labels: []models.Labels{
				{{Name: "alertname", Value: "alert2"}},
				{{Name: "alertname", Value: "alert1"}},
			},
			sortKeys: []string{},
			fallback: "alertname",
			output: []models.Labels{
				{{Name: "alertname", Value: "alert1"}},
				{{Name: "alertname", Value: "alert2"}},
			},
		},
		{
			labels: []models.Labels{
				{{Name: "alertname", Value: "alert2"}},
				{{Name: "alertname", Value: "alert1"}},
			},
			sortKeys: []string{"foo"},
			fallback: "alertname",
			output: []models.Labels{
				{{Name: "alertname", Value: "alert1"}},
				{{Name: "alertname", Value: "alert2"}},
			},
		},
		{
			labels: []models.Labels{
				{{Name: "alertname", Value: "alert1"}},
				{{Name: "alertname", Value: "alert1"}},
			},
			sortKeys: []string{"alertname"},
			fallback: "alertname",
			output: []models.Labels{
				{{Name: "alertname", Value: "alert1"}},
				{{Name: "alertname", Value: "alert1"}},
			},
		},
		{
			labels: []models.Labels{
				{{Name: "alertname", Value: "alert2"}, {Name: "job", Value: "a"}},
				{{Name: "alertname", Value: "alert1"}},
				{{Name: "alertname", Value: "alert3"}, {Name: "job", Value: "b"}},
			},
			sortKeys: []string{"job"},
			fallback: "alertname",
			output: []models.Labels{
				{{Name: "alertname", Value: "alert2"}, {Name: "job", Value: "a"}},
				{{Name: "alertname", Value: "alert3"}, {Name: "job", Value: "b"}},
				{{Name: "alertname", Value: "alert1"}},
			},
		},
	}

	for i, tc := range testCases {
		t.Run(fmt.Sprintf("%d:%v", i, tc.sortKeys), func(t *testing.T) {
			sortSliceOfLabels(tc.labels, tc.sortKeys, tc.fallback)
			if diff := cmp.Diff(tc.output, tc.labels); diff != "" {
				t.Errorf("Wrong labels order after sorting (-want +got):\n%s", diff)
			}
		})
	}
}

func TestCounters(t *testing.T) {
	type testCaseT struct {
		args string
	}

	testCases := []testCaseT{
		{
			args: "q=foo=bar",
		},
		{
			args: "",
		},
		{
			args: "q=@receiver=by-cluster-service&q=alertname=Host_Down&q=@state=active",
		},
		{
			args: "q=@cluster=single",
		},
	}

	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	mockCache()
	version := mock.ListAllMocks()[0]

	am1, err := alertmanager.NewAlertmanager(
		"cluster",
		"am1",
		"http://localhost/1",
	)
	if err != nil {
		t.Error(err)
	}
	mock.RegisterURL("http://localhost/1/metrics", version, "metrics")
	mock.RegisterURL("http://localhost/1/api/v2/silences", version, "api/v2/silences")
	mock.RegisterURL("http://localhost/1/api/v2/alerts/groups", version, "api/v2/alerts/groups")
	err = alertmanager.RegisterAlertmanager(am1)
	if err != nil {
		t.Error(err)
	}

	am2, err := alertmanager.NewAlertmanager(
		"cluster",
		"am2",
		"http://localhost/2",
	)
	if err != nil {
		t.Error(err)
	}
	mock.RegisterURL("http://localhost/2/metrics", version, "metrics")
	mock.RegisterURL("http://localhost/2/api/v2/silences", version, "api/v2/silences")
	mock.RegisterURL("http://localhost/2/api/v2/alerts/groups", version, "api/v2/alerts/groups")
	err = alertmanager.RegisterAlertmanager(am2)
	if err != nil {
		t.Error(err)
	}

	am3, err := alertmanager.NewAlertmanager(
		"single",
		"single",
		"http://localhost/3",
	)
	if err != nil {
		t.Error(err)
	}
	mock.RegisterURL("http://localhost/3/metrics", version, "metrics")
	mock.RegisterURL("http://localhost/3/api/v2/silences", version, "api/v2/silences")
	mock.RegisterURL("http://localhost/3/api/v2/alerts/groups", version, "api/v2/alerts/groups")
	err = alertmanager.RegisterAlertmanager(am3)
	if err != nil {
		t.Error(err)
	}

	pullFromAlertmanager()

	for _, tc := range testCases {
		t.Run(tc.args, func(t *testing.T) {
			r := testRouter()
			setupRouter(r, nil)
			// re-run a few times to test the cache
			for i := 1; i <= 3; i++ {
				req := httptest.NewRequest("GET", "/counters.json?"+tc.args, nil)
				resp := httptest.NewRecorder()
				r.ServeHTTP(resp, req)
				if resp.Code != http.StatusOK {
					t.Errorf("GET /counters.json returned status %d", resp.Code)
				}
				abide.AssertHTTPResponse(t, t.Name(), resp.Result())
			}
		})
	}
}

func TestLabelSettings(t *testing.T) {
	type testCaseT struct {
		static      []string
		valueOnly   []string
		valueOnlyRe []*regexp.Regexp
		labels      models.LabelsSettings
	}

	testCases := []testCaseT{
		{
			static:      []string{},
			valueOnly:   []string{},
			valueOnlyRe: []*regexp.Regexp{},
			labels:      models.LabelsSettings{},
		},
		{
			static:      []string{"job"},
			valueOnly:   []string{},
			valueOnlyRe: []*regexp.Regexp{},
			labels: models.LabelsSettings{
				"job": models.LabelSettings{
					IsStatic:    true,
					IsValueOnly: false,
				},
			},
		},
		{
			static:      []string{"job"},
			valueOnly:   []string{"job"},
			valueOnlyRe: []*regexp.Regexp{},
			labels: models.LabelsSettings{
				"job": models.LabelSettings{
					IsStatic:    true,
					IsValueOnly: true,
				},
			},
		},
		{
			static:      []string{},
			valueOnly:   []string{},
			valueOnlyRe: []*regexp.Regexp{regex.MustCompileAnchored("al.*e")},
			labels: models.LabelsSettings{
				"alertname": models.LabelSettings{
					IsStatic:    false,
					IsValueOnly: true,
				},
			},
		},
		{
			static:      []string{"@alertmanager", "@cluster", "@inhibited", "@inhibited_by", "@receiver", "@state"},
			valueOnly:   []string{},
			valueOnlyRe: []*regexp.Regexp{regex.MustCompileAnchored("@.+")},
			labels: models.LabelsSettings{
				"@alertmanager": models.LabelSettings{
					IsStatic:    true,
					IsValueOnly: true,
				},
				"@cluster": models.LabelSettings{
					IsStatic:    true,
					IsValueOnly: true,
				},
				"@inhibited": models.LabelSettings{
					IsStatic:    true,
					IsValueOnly: true,
				},
				"@inhibited_by": models.LabelSettings{
					IsStatic:    true,
					IsValueOnly: true,
				},
				"@receiver": models.LabelSettings{
					IsStatic:    true,
					IsValueOnly: true,
				},
				"@state": models.LabelSettings{
					IsStatic:    true,
					IsValueOnly: true,
				},
			},
		},
		{
			static:      []string{},
			valueOnly:   []string{"alertname"},
			valueOnlyRe: []*regexp.Regexp{},
			labels: models.LabelsSettings{
				"alertname": models.LabelSettings{
					IsStatic:    false,
					IsValueOnly: true,
				},
			},
		},
	}

	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	mockCache()
	version := mock.ListAllMocks()[0]

	payload, err := json.Marshal(models.AlertsRequest{
		Filters:           []string{},
		GridLimits:        map[string]int{},
		DefaultGroupLimit: 5,
	})
	if err != nil {
		t.Error(err)
		t.FailNow()
	}

	defer func() {
		config.Config.Labels.Color.Static = []string{}
		config.Config.Labels.ValueOnly = []string{}
		config.Config.Labels.CompiledValueOnlyRegex = []*regexp.Regexp{}
	}()

	for i, tc := range testCases {
		mockConfig(t.Setenv)
		t.Logf("Testing alerts using mock files from Alertmanager %s", version)
		mockAlerts(version)
		config.Config.Labels.Color.Static = tc.static
		config.Config.Labels.ValueOnly = tc.valueOnly
		config.Config.Labels.CompiledValueOnlyRegex = tc.valueOnlyRe
		t.Run(fmt.Sprintf("%d", i), func(t *testing.T) {
			r := testRouter()
			setupRouter(r, nil)
			for i := 1; i <= 3; i++ {
				req := httptest.NewRequest("POST", "/alerts.json", bytes.NewReader(payload))
				resp := httptest.NewRecorder()
				r.ServeHTTP(resp, req)
				if resp.Code != http.StatusOK {
					t.Errorf("POST /alerts.json returned status %d", resp.Code)
				}
				ur := models.AlertsResponse{}
				err := json.Unmarshal(resp.Body.Bytes(), &ur)
				if err != nil {
					t.Errorf("Failed to unmarshal response: %s", err)
				}
				if ur.TotalAlerts == 0 {
					t.Error("TotalAlerts=0")
					t.FailNow()
				}
				if diff := cmp.Diff(tc.labels, ur.Settings.Labels); diff != "" {
					t.Errorf("Wrong labels returned (-want +got):\n%s", diff)
				}
			}
		})
	}
}
