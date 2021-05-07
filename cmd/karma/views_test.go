package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"regexp"
	"sort"
	"strings"
	"testing"
	"time"

	lru "github.com/hashicorp/golang-lru"
	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/mock"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/slices"

	"github.com/go-chi/chi/v5"
	"github.com/google/go-cmp/cmp"
	"github.com/jarcoal/httpmock"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/pflag"
)

var upstreamSetup = false

func mockConfig() {
	zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	os.Setenv("ALERTMANAGER_URI", "http://localhost")
	os.Setenv("LABELS_COLOR_UNIQUE", "alertname @receiver @alertmanager @cluster")

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

	err := loadTemplates()
	if err != nil {
		panic(err)
	}

	return router
}

func TestHealth(t *testing.T) {
	mockConfig()
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
	mockConfig()
	r := testRouter()
	setupRouter(r, nil)
	req := httptest.NewRequest("GET", "/robots.txt", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusOK {
		t.Errorf("GET /robots.txt returned status %d", resp.Code)
	}
}

func TestHealthPrefix(t *testing.T) {
	os.Setenv("LISTEN_PREFIX", "/prefix")
	defer os.Unsetenv("LISTEN_PREFIX")
	mockConfig()
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
			request: "/alerts.json",
			status:  200,
		},
		{
			prefix:  "/",
			request: "/",
			status:  200,
		},
		{
			prefix:  "/",
			request: "/alerts.json",
			status:  200,
		},
		{
			prefix:  "/prefix",
			request: "/",
			status:  404,
		},
		{
			prefix:  "/prefix",
			request: "/alerts.json",
			status:  404,
		},
		{
			prefix:  "/prefix",
			request: "/prefix/",
			status:  200,
		},
		{
			prefix:  "/prefix",
			request: "/prefix/alerts.json",
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
			request: "/prefix/alerts.json",
			status:  200,
		},
	}

	defer func() {
		config.Config.Listen.Prefix = "/"
	}()

	for _, tc := range testCases {
		t.Run(fmt.Sprintf("prefix=%s request=%s status=%d", tc.prefix, tc.request, tc.status), func(t *testing.T) {
			os.Setenv("LISTEN_PREFIX", tc.prefix)
			defer os.Unsetenv("LISTEN_PREFIX")
			mockConfig()
			r := testRouter()
			setupRouter(r, nil)
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
		apiCache, _ = lru.New(100)
	} else {
		apiCache.Purge()
	}
}

func mockAlerts(version string) {
	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	mockCache()

	mock.RegisterURL("http://localhost/metrics", version, "metrics")
	mock.RegisterURL("http://localhost/api/v2/status", version, "api/v2/status")
	mock.RegisterURL("http://localhost/api/v2/silences", version, "api/v2/silences")
	mock.RegisterURL("http://localhost/api/v2/alerts/groups", version, "api/v2/alerts/groups")

	pullFromAlertmanager()
}

func TestAlerts(t *testing.T) {
	mockConfig()
	for _, version := range mock.ListAllMocks() {
		t.Logf("Testing alerts using mock files from Alertmanager %s", version)
		mockAlerts(version)
		r := testRouter()
		setupRouter(r, nil)
		// re-run a few times to test the cache
		for i := 1; i <= 3; i++ {
			req := httptest.NewRequest("GET", "/alerts.json?q=@receiver=by-cluster-service&q=alertname=HTTP_Probe_Failed&q=instance=web1", nil)
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
			if len(ur.Counters) != 6 {
				t.Errorf("[%s] Invalid number of counters in response (%d): %v", version, len(ur.Counters), ur.Counters)
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

func TestGrids(t *testing.T) {
	type testCaseGridT struct {
		labelValue      string
		alertGroupCount int
	}
	type testCaseT struct {
		gridLabel    string
		requestQuery string
		grids        []testCaseGridT
	}
	testCases := []testCaseT{
		{
			gridLabel:    "cluster",
			requestQuery: "",
			grids: []testCaseGridT{
				{labelValue: "dev", alertGroupCount: 4},
				{labelValue: "prod", alertGroupCount: 4},
				{labelValue: "staging", alertGroupCount: 4},
			},
		},
		{
			gridLabel:    "cluster",
			requestQuery: "&gridSortReverse=1",
			grids: []testCaseGridT{
				{labelValue: "staging", alertGroupCount: 4},
				{labelValue: "prod", alertGroupCount: 4},
				{labelValue: "dev", alertGroupCount: 4},
			},
		},
		{
			gridLabel:    "foo",
			requestQuery: "",
			grids: []testCaseGridT{
				{labelValue: "", alertGroupCount: 10},
			},
		},
		{
			gridLabel:    "",
			requestQuery: "",
			grids: []testCaseGridT{
				{labelValue: "", alertGroupCount: 10},
			},
		},
		{
			gridLabel:    "",
			requestQuery: "&q=foo=bar",
			grids:        []testCaseGridT{},
		},
		{
			gridLabel:    "disk",
			requestQuery: "",
			grids: []testCaseGridT{
				{labelValue: "sda", alertGroupCount: 2},
				{labelValue: "", alertGroupCount: 8},
			},
		},
		{
			gridLabel:    "disk",
			requestQuery: "&gridSortReverse=1",
			grids: []testCaseGridT{
				{labelValue: "", alertGroupCount: 8},
				{labelValue: "sda", alertGroupCount: 2},
			},
		},
		{
			gridLabel:    "disk",
			requestQuery: "&q=alertname=Free_Disk_Space_Too_Low",
			grids: []testCaseGridT{
				{labelValue: "sda", alertGroupCount: 2},
			},
		},
		{
			gridLabel:    "@alertmanager",
			requestQuery: "",
			grids: []testCaseGridT{
				{labelValue: "default", alertGroupCount: 10},
			},
		},
		{
			gridLabel:    "@cluster",
			requestQuery: "",
			grids: []testCaseGridT{
				{labelValue: "default", alertGroupCount: 10},
			},
		},
		{
			gridLabel:    "@receiver",
			requestQuery: "",
			grids: []testCaseGridT{
				{labelValue: "by-cluster-service", alertGroupCount: 6},
				{labelValue: "by-name", alertGroupCount: 4},
			},
		},
		{
			gridLabel:    "@receiver",
			requestQuery: "&gridSortReverse=1",
			grids: []testCaseGridT{
				{labelValue: "by-name", alertGroupCount: 4},
				{labelValue: "by-cluster-service", alertGroupCount: 6},
			},
		},
		{
			gridLabel:    "@receiver",
			requestQuery: "&q=@receiver=by-name",
			grids: []testCaseGridT{
				{labelValue: "by-name", alertGroupCount: 4},
			},
		},
	}

	mockConfig()
	for _, version := range mock.ListAllMocks() {
		version := version
		for _, testCase := range testCases {
			testCase := testCase
			t.Run(fmt.Sprintf("version=%q gridLabel=%q query=%q", version, testCase.gridLabel, testCase.requestQuery), func(t *testing.T) {
				mockAlerts(version)
				r := testRouter()
				setupRouter(r, nil)
				// re-run a few times to test the cache
				for i := 1; i <= 3; i++ {
					apiCache.Purge()
					req := httptest.NewRequest("GET", "/alerts.json?gridLabel="+testCase.gridLabel+testCase.requestQuery, nil)
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

					if len(ur.Grids) != len(testCase.grids) {
						t.Errorf("Expected %d grids, got %d", len(testCase.grids), len(ur.Grids))
					} else {
						for index, expectedGrid := range testCase.grids {
							grid := ur.Grids[index]
							if grid.LabelName != testCase.gridLabel {
								t.Errorf("Got wrong labelName for grid %d: %q, expected %q", index, grid.LabelName, testCase.gridLabel)
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
	mockConfig()
	for _, version := range mock.ListAllMocks() {
		t.Logf("Validating alerts.json response using mock files from Alertmanager %s", version)
		mockAlerts(version)
		r := testRouter()
		setupRouter(r, nil)
		// re-run a few times to test the cache
		for i := 1; i <= 3; i++ {
			req := httptest.NewRequest("GET", "/alerts.json?q=alertname=HTTP_Probe_Failed&q=instance=web1", nil)
			resp := httptest.NewRecorder()
			r.ServeHTTP(resp, req)
			if resp.Code != http.StatusOK {
				t.Errorf("GET /alerts.json returned status %d", resp.Code)
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
	mockConfig()
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
	mockConfig()
	r := testRouter()
	setupRouter(r, nil)
	paths := []string{"/", "/alerts.json", "/autocomplete.json", "/metrics"}
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
	mockConfig()
	r := testRouter()
	setupRouter(r, nil)
	paths := []string{"/", "/alerts.json", "/autocomplete.json", "/metrics"}
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

	mockConfig()
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
	mockConfig()
	r := testRouter()
	setupRouter(r, nil)
	req := httptest.NewRequest("OPTIONS", "/alerts.json", nil)
	req.Header.Set("Origin", "foo.example.com")
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Header().Get("Access-Control-Allow-Origin") != "foo.example.com" {
		t.Errorf("Invalid Access-Control-Allow-Origin value %q, expected 'foo.example.com'", resp.Header().Get("Access-Control-Allow-Origin"))
	}
}

func TestEmptySettings(t *testing.T) {
	mockConfig()
	r := testRouter()
	setupRouter(r, nil)
	req := httptest.NewRequest("GET", "/alerts.json", nil)

	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusOK {
		t.Errorf("GET /alerts.json returned status %d", resp.Code)
	}
	ur := models.AlertsResponse{}
	body := resp.Body.Bytes()
	err := json.Unmarshal(body, &ur)
	if err != nil {
		t.Errorf("Failed to unmarshal response: %s", err)
	}

	expectedSettings := models.Settings{
		StaticColorLabels:        []string{},
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
		},
		AlertAcknowledgement: models.AlertAcknowledgementSettings{
			Enabled:         false,
			DurationSeconds: 900,
			Author:          "karma",
			Comment:         "ACK! This alert was acknowledged using karma on %NOW%",
		},
		HistoryEnabled: true,
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
		basicAuthUsers           []config.AuthenticationUser
		requestHeaders           map[string]string
		requestBasicAuthUser     string
		requestBasicAuthPassword string
		responseCode             int
		responseUsername         string
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
		},
	}

	for _, testCase := range authTests {
		t.Run(testCase.name, func(t *testing.T) {
			config.Config.Authentication.Header.Name = testCase.headerName
			config.Config.Authentication.Header.ValueRegex = testCase.headerRe
			config.Config.Authentication.BasicAuth.Users = testCase.basicAuthUsers
			r := testRouter()
			setupRouter(r, nil)
			mockCache()
			for _, path := range []string{
				"/",
				"/alerts.json",
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
				req := httptest.NewRequest("GET", path, nil)
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
		"/alerts.json",
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

func TestUpstreamStatus(t *testing.T) {
	zerolog.SetGlobalLevel(zerolog.FatalLevel)

	type mockT struct {
		uri  string
		code int
		body string
	}

	type testCaseT struct {
		Name      string
		mocks     []mockT
		upstreams []config.AlertmanagerConfig
		status    models.AlertmanagerAPISummary
	}

	testCases := []testCaseT{
		{
			Name: "404 from upstream",
			mocks: []mockT{
				{
					uri:  "http://localhost:9093/metrics",
					code: 404,
					body: "not found",
				},
				{
					uri:  "http://localhost:9093/api/v2/status",
					code: 404,
					body: "not found",
				},
			},
			upstreams: []config.AlertmanagerConfig{
				{
					Name:        "default",
					URI:         "http://localhost:9093",
					ExternalURI: "http://example.com",
					ReadOnly:    true,
					Headers: map[string]string{
						"X-Foo": "Bar",
						"X-Bar": "Foo",
					},
					CORS: config.AlertmanagerCORS{
						Credentials: "include",
					},
					Timeout: time.Second * 10,
				},
			},
			status: models.AlertmanagerAPISummary{
				Counters: models.AlertmanagerAPICounters{
					Total:   1,
					Healthy: 0,
					Failed:  1,
				},
				Instances: []models.AlertmanagerAPIStatus{
					{
						Name:      "default",
						URI:       "http://example.com",
						PublicURI: "http://example.com",
						ReadOnly:  true,
						Headers: map[string]string{
							"X-Foo": "Bar",
							"X-Bar": "Foo",
						},
						CORSCredentials: "include",
						Error:           `^response status code does not match any response statuses defined for this endpoint in the swagger spec \(status 404\): .+`,
						Version:         "",
						Cluster:         "default",
						ClusterMembers:  []string{"default"},
					},
				},
				Clusters: map[string][]string{
					"default": {"default"},
				},
			},
		},
		{
			Name: "HA Cluster",
			mocks: []mockT{
				{
					uri:  "http://ha1.example.com/metrics",
					code: 200,
					body: `alertmanager_build_info{version="0.20.0"} 1
					`,
				},
				{
					uri:  "http://ha2.example.com/metrics",
					code: 200,
					body: `alertmanager_build_info{version="0.19.0"} 1
					`,
				},
				{
					uri:  "http://ha1.example.com/api/v2/status",
					code: 200,
					body: `{
  "cluster": {
		"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA",
		"peers": [
		  {
				"address": "10.16.0.1:9094",
				"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA"
			},
			{
				"address": "10.16.0.2:9094",
				"name": "BBBBBBBBBBBBBBBBBBBBBBBBBB"
			}
		],
		"status": "ready"
  },
	"versionInfo": {
		"version":"0.20.0"
	}
}`,
				},
				{
					uri:  "http://ha2.example.com/api/v2/status",
					code: 200,
					body: `{
	"cluster": {
		"name": "BBBBBBBBBBBBBBBBBBBBBBBBBB",
		"peers": [
			{
				"address": "10.16.0.1:9094",
				"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA"
			},
			{
				"address": "10.16.0.2:9094",
				"name": "BBBBBBBBBBBBBBBBBBBBBBBBBB"
			}
		],
		"status": "ready"
	},
	"versionInfo": {
		"version":"0.19.0"
	}
}`,
				},
				{
					uri:  "http://ha1.example.com/api/v2/alerts/groups",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://ha1.example.com/api/v2/silences",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://ha2.example.com/api/v2/alerts/groups",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://ha2.example.com/api/v2/silences",
					code: 200,
					body: "[]",
				},
			},
			upstreams: []config.AlertmanagerConfig{
				{
					Cluster:  "HA",
					Name:     "ha1",
					URI:      "http://ha1.example.com",
					Proxy:    false,
					ReadOnly: false,
					Headers:  map[string]string{},
					CORS: config.AlertmanagerCORS{
						Credentials: "omit",
					},
					Timeout: time.Second * 10,
				},
				{
					Cluster:  "HA",
					Name:     "ha2",
					URI:      "http://ha2.example.com",
					Proxy:    false,
					ReadOnly: true,
					Headers:  map[string]string{},
					CORS: config.AlertmanagerCORS{
						Credentials: "omit",
					},
					Timeout: time.Second * 10,
				},
			},
			status: models.AlertmanagerAPISummary{
				Counters: models.AlertmanagerAPICounters{
					Total:   2,
					Healthy: 2,
					Failed:  0,
				},
				Instances: []models.AlertmanagerAPIStatus{
					{
						Name:            "ha1",
						URI:             "http://ha1.example.com",
						PublicURI:       "http://ha1.example.com",
						ReadOnly:        false,
						Headers:         map[string]string{},
						CORSCredentials: "omit",
						Error:           "",
						Version:         "0.20.0",
						Cluster:         "HA",
						ClusterMembers:  []string{"ha1", "ha2"},
					},
					{
						Name:            "ha2",
						URI:             "http://ha2.example.com",
						PublicURI:       "http://ha2.example.com",
						ReadOnly:        true,
						Headers:         map[string]string{},
						CORSCredentials: "omit",
						Error:           "",
						Version:         "0.19.0",
						Cluster:         "HA",
						ClusterMembers:  []string{"ha1", "ha2"},
					},
				},
				Clusters: map[string][]string{
					"HA": {"ha1", "ha2"},
				},
			},
		},
		{
			Name: "HA Cluster Without Name",
			mocks: []mockT{
				{
					uri:  "http://ha1.example.com/metrics",
					code: 200,
					body: `alertmanager_build_info{version="0.20.0"} 1
					`,
				},
				{
					uri:  "http://ha2.example.com/metrics",
					code: 200,
					body: `alertmanager_build_info{version="0.19.0"} 1
					`,
				},
				{
					uri:  "http://ha1.example.com/api/v2/status",
					code: 200,
					body: `{
	"cluster": {
		"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA",
		"peers": [
			{
				"address": "10.16.0.1:9094",
				"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA"
			},
			{
				"address": "10.16.0.2:9094",
				"name": "BBBBBBBBBBBBBBBBBBBBBBBBBB"
			}
		],
		"status": "ready"
	},
	"versionInfo": {
		"version":"0.20.0"
	}
}`,
				},
				{
					uri:  "http://ha2.example.com/api/v2/status",
					code: 200,
					body: `{
	"cluster": {
		"name": "BBBBBBBBBBBBBBBBBBBBBBBBBB",
		"peers": [
			{
				"address": "10.16.0.1:9094",
				"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA"
			},
			{
				"address": "10.16.0.2:9094",
				"name": "BBBBBBBBBBBBBBBBBBBBBBBBBB"
			}
		],
		"status": "ready"
	},
	"versionInfo": {
		"version":"0.19.0"
	}
}`,
				},
				{
					uri:  "http://ha1.example.com/api/v2/alerts/groups",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://ha1.example.com/api/v2/silences",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://ha2.example.com/api/v2/alerts/groups",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://ha2.example.com/api/v2/silences",
					code: 200,
					body: "[]",
				},
			},
			upstreams: []config.AlertmanagerConfig{
				{
					Name:     "ha1",
					URI:      "http://ha1.example.com",
					Proxy:    false,
					ReadOnly: false,
					Headers:  map[string]string{},
					CORS: config.AlertmanagerCORS{
						Credentials: "same-site",
					},
					Timeout: time.Second * 10,
				},
				{
					Name:     "ha2",
					URI:      "http://ha2.example.com",
					Proxy:    false,
					ReadOnly: true,
					Headers:  map[string]string{},
					CORS: config.AlertmanagerCORS{
						Credentials: "same-site",
					},
					Timeout: time.Second * 10,
				},
			},
			status: models.AlertmanagerAPISummary{
				Counters: models.AlertmanagerAPICounters{
					Total:   2,
					Healthy: 2,
					Failed:  0,
				},
				Instances: []models.AlertmanagerAPIStatus{
					{
						Name:            "ha1",
						URI:             "http://ha1.example.com",
						PublicURI:       "http://ha1.example.com",
						ReadOnly:        false,
						Headers:         map[string]string{},
						CORSCredentials: "same-site",
						Error:           "",
						Version:         "0.20.0",
						Cluster:         "ha1 | ha2",
						ClusterMembers:  []string{"ha1", "ha2"},
					},
					{
						Name:            "ha2",
						URI:             "http://ha2.example.com",
						PublicURI:       "http://ha2.example.com",
						ReadOnly:        true,
						Headers:         map[string]string{},
						CORSCredentials: "same-site",
						Error:           "",
						Version:         "0.19.0",
						Cluster:         "ha1 | ha2",
						ClusterMembers:  []string{"ha1", "ha2"},
					},
				},
				Clusters: map[string][]string{
					"ha1 | ha2": {"ha1", "ha2"},
				},
			},
		},
		{
			Name: "Broken Cluster",
			mocks: []mockT{
				{
					uri:  "http://ha1.example.com/metrics",
					code: 200,
					body: `alertmanager_build_info{version="0.20.0"} 1
					`,
				},
				{
					uri:  "http://ha2.example.com/metrics",
					code: 200,
					body: `alertmanager_build_info{version="0.19.0"} 1
					`,
				},
				{
					uri:  "http://ha1.example.com/api/v2/status",
					code: 200,
					body: `{
  "cluster": {
		"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA",
		"peers": [
		  {
				"address": "10.16.0.1:9094",
				"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA"
			}
		],
		"status": "ready"
  },
	"versionInfo": {
		"version":"0.20.0"
	}
}`,
				},
				{
					uri:  "http://ha2.example.com/api/v2/status",
					code: 200,
					body: `{
	"cluster": {
		"name": "BBBBBBBBBBBBBBBBBBBBBBBBBB",
		"peers": [
			{
				"address": "10.16.0.2:9094",
				"name": "BBBBBBBBBBBBBBBBBBBBBBBBBB"
			}
		],
		"status": "ready"
	},
	"versionInfo": {
		"version":"0.19.0"
	}
}`,
				},
				{
					uri:  "http://ha1.example.com/api/v2/alerts/groups",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://ha1.example.com/api/v2/silences",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://ha2.example.com/api/v2/alerts/groups",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://ha2.example.com/api/v2/silences",
					code: 200,
					body: "[]",
				},
			},
			upstreams: []config.AlertmanagerConfig{
				{
					Cluster:  "Broken HA",
					Name:     "ha1",
					URI:      "http://ha1.example.com",
					Proxy:    false,
					ReadOnly: false,
					Headers:  map[string]string{},
					CORS: config.AlertmanagerCORS{
						Credentials: "omit",
					},
					Timeout: time.Second * 10,
				},
				{
					Cluster:  "Broken HA",
					Name:     "ha2",
					URI:      "http://ha2.example.com",
					Proxy:    false,
					ReadOnly: true,
					Headers:  map[string]string{},
					CORS: config.AlertmanagerCORS{
						Credentials: "omit",
					},
					Timeout: time.Second * 10,
				},
			},
			status: models.AlertmanagerAPISummary{
				Counters: models.AlertmanagerAPICounters{
					Total:   2,
					Healthy: 2,
					Failed:  0,
				},
				Instances: []models.AlertmanagerAPIStatus{
					{
						Name:            "ha1",
						URI:             "http://ha1.example.com",
						PublicURI:       "http://ha1.example.com",
						ReadOnly:        false,
						Headers:         map[string]string{},
						CORSCredentials: "omit",
						Error:           "missing cluster peers: ha2",
						Version:         "0.20.0",
						Cluster:         "Broken HA",
						ClusterMembers:  []string{"ha1"},
					},
					{
						Name:            "ha2",
						URI:             "http://ha2.example.com",
						PublicURI:       "http://ha2.example.com",
						ReadOnly:        true,
						Headers:         map[string]string{},
						CORSCredentials: "omit",
						Error:           "missing cluster peers: ha1",
						Version:         "0.19.0",
						Cluster:         "Broken HA",
						ClusterMembers:  []string{"ha2"},
					},
				},
				Clusters: map[string][]string{
					"Broken HA": {"ha1"},
				},
			},
		},
		{
			Name: "Split Cluster Without Name",
			mocks: []mockT{
				{
					uri:  "http://ha1.example.com/metrics",
					code: 200,
					body: `alertmanager_build_info{version="0.20.0"} 1
					`,
				},
				{
					uri:  "http://ha2.example.com/metrics",
					code: 200,
					body: `alertmanager_build_info{version="0.19.0"} 1
					`,
				},
				{
					uri:  "http://ha1.example.com/api/v2/status",
					code: 200,
					body: `{
	"cluster": {
		"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA",
		"peers": [
			{
				"address": "10.16.0.1:9094",
				"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA"
			}
		],
		"status": "ready"
	},
	"versionInfo": {
		"version":"0.20.0"
	}
}`,
				},
				{
					uri:  "http://ha2.example.com/api/v2/status",
					code: 200,
					body: `{
	"cluster": {
		"name": "BBBBBBBBBBBBBBBBBBBBBBBBBB",
		"peers": [
			{
				"address": "10.16.0.2:9094",
				"name": "BBBBBBBBBBBBBBBBBBBBBBBBBB"
			}
		],
		"status": "ready"
	},
	"versionInfo": {
		"version":"0.19.0"
	}
}`,
				},
				{
					uri:  "http://ha1.example.com/api/v2/alerts/groups",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://ha1.example.com/api/v2/silences",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://ha2.example.com/api/v2/alerts/groups",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://ha2.example.com/api/v2/silences",
					code: 200,
					body: "[]",
				},
			},
			upstreams: []config.AlertmanagerConfig{
				{
					Name:     "ha1",
					URI:      "http://ha1.example.com",
					Proxy:    false,
					ReadOnly: false,
					Headers:  map[string]string{},
					CORS: config.AlertmanagerCORS{
						Credentials: "omit",
					},
					Timeout: time.Second * 10,
				},
				{
					Name:     "ha2",
					URI:      "http://ha2.example.com",
					Proxy:    false,
					ReadOnly: true,
					Headers:  map[string]string{},
					CORS: config.AlertmanagerCORS{
						Credentials: "omit",
					},
					Timeout: time.Second * 10,
				},
			},
			status: models.AlertmanagerAPISummary{
				Counters: models.AlertmanagerAPICounters{
					Total:   2,
					Healthy: 2,
					Failed:  0,
				},
				Instances: []models.AlertmanagerAPIStatus{
					{
						Name:            "ha1",
						URI:             "http://ha1.example.com",
						PublicURI:       "http://ha1.example.com",
						ReadOnly:        false,
						Headers:         map[string]string{},
						CORSCredentials: "omit",
						Error:           "",
						Version:         "0.20.0",
						Cluster:         "ha1",
						ClusterMembers:  []string{"ha1"},
					},
					{
						Name:            "ha2",
						URI:             "http://ha2.example.com",
						PublicURI:       "http://ha2.example.com",
						ReadOnly:        true,
						Headers:         map[string]string{},
						CORSCredentials: "omit",
						Error:           "",
						Version:         "0.19.0",
						Cluster:         "ha2",
						ClusterMembers:  []string{"ha2"},
					},
				},
				Clusters: map[string][]string{
					"ha1": {"ha1"},
					"ha2": {"ha2"},
				},
			},
		},
		{
			Name: "Broken Cluster Without Name",
			mocks: []mockT{
				{
					uri:  "http://broken1.example.com/metrics",
					code: 200,
					body: `alertmanager_build_info{version="0.20.0"} 1
					`,
				},
				{
					uri:  "http://broken2.example.com/metrics",
					code: 200,
					body: `alertmanager_build_info{version="0.20.0"} 1
					`,
				},
				{
					uri:  "http://broken1.example.com/api/v2/status",
					code: 200,
					body: `{
	"cluster": {
		"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA",
		"peers": [
			{
				"address": "10.16.0.1:9094",
				"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA"
			},
			{
				"address": "10.16.0.2:9094",
				"name": "BBBBBBBBBBBBBBBBBBBBBBBBBB"
			}
		],
		"status": "ready"
	},
	"versionInfo": {
		"version":"0.20.0"
	}
}`,
				},
				{
					uri:  "http://broken2.example.com/api/v2/status",
					code: 200,
					body: `{
	"cluster": {
		"name": "BBBBBBBBBBBBBBBBBBBBBBBBBB",
		"peers": [
			{
				"address": "10.16.0.1:9094",
				"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA"
			},
			{
				"address": "10.16.0.2:9094",
				"name": "BBBBBBBBBBBBBBBBBBBBBBBBBB"
			}
		],
		"status": "ready"
	},
	"versionInfo": {
		"version":"0.20.0"
	}
}`,
				},
				{
					uri:  "http://broken1.example.com/api/v2/alerts/groups",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://broken1.example.com/api/v2/silences",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://broken2.example.com/api/v2/alerts/groups",
					code: 500,
					body: "Internal Error\n",
				},
				{
					uri:  "http://broken2.example.com/api/v2/silences",
					code: 500,
					body: "Internal Error\n",
				},
			},
			upstreams: []config.AlertmanagerConfig{
				{
					Name:     "broken1",
					URI:      "http://broken1.example.com",
					Proxy:    false,
					ReadOnly: false,
					Headers:  map[string]string{},
					CORS: config.AlertmanagerCORS{
						Credentials: "omit",
					},
					Timeout: time.Second * 10,
				},
				{
					Name:     "broken2",
					URI:      "http://broken2.example.com",
					Proxy:    false,
					ReadOnly: true,
					Headers:  map[string]string{},
					CORS: config.AlertmanagerCORS{
						Credentials: "omit",
					},
					Timeout: time.Second * 10,
				},
			},
			status: models.AlertmanagerAPISummary{
				Counters: models.AlertmanagerAPICounters{
					Total:   2,
					Healthy: 1,
					Failed:  1,
				},
				Instances: []models.AlertmanagerAPIStatus{
					{
						Name:            "broken1",
						URI:             "http://broken1.example.com",
						PublicURI:       "http://broken1.example.com",
						ReadOnly:        false,
						Headers:         map[string]string{},
						CORSCredentials: "omit",
						Error:           "",
						Version:         "0.20.0",
						Cluster:         "broken1 | broken2",
						ClusterMembers:  []string{"broken1", "broken2"},
					},
					{
						Name:            "broken2",
						URI:             "http://broken2.example.com",
						PublicURI:       "http://broken2.example.com",
						ReadOnly:        true,
						Headers:         map[string]string{},
						CORSCredentials: "omit",
						Error:           "invalid character 'I' looking for beginning of value",
						Version:         "0.20.0",
						Cluster:         "broken1 | broken2",
						ClusterMembers:  []string{"broken1", "broken2"},
					},
				},
				Clusters: map[string][]string{
					"broken1 | broken2": {"broken1", "broken2"},
				},
			},
		},
		{
			Name: "Cluster with name and errors",
			mocks: []mockT{
				{
					uri:  "http://ha1.example.com/metrics",
					code: 500,
					body: `Error`,
				},
				{
					uri:  "http://ha2.example.com/metrics",
					code: 200,
					body: `alertmanager_build_info{version="0.21.0"} 1
					`,
				},
				{
					uri:  "http://ha1.example.com/api/v2/status",
					code: 200,
					body: `{
	"cluster": {
		"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA",
		"peers": [
			{
				"address": "10.16.0.1:9094",
				"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA"
			},
			{
				"address": "10.16.0.1:9095",
				"name": "BBBBBBBBBBBBBBBBBBBBBBBBBB"
			}
		],
		"status": "ready"
	},
	"versionInfo": {
		"version":"0.20.0"
	}
}`,
				},
				{
					uri:  "http://ha2.example.com/api/v2/status",
					code: 200,
					body: `{
	"cluster": {
		"name": "BBBBBBBBBBBBBBBBBBBBBBBBBB",
		"peers": [
			{
				"address": "10.16.0.1:9094",
				"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA"
			},
			{
				"address": "10.16.0.2:9095",
				"name": "BBBBBBBBBBBBBBBBBBBBBBBBBB"
			}
		],
		"status": "ready"
	},
	"versionInfo": {
		"version":"0.19.0"
	}
}`,
				},
				{
					uri:  "http://ha1.example.com/api/v2/alerts/groups",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://ha1.example.com/api/v2/silences",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://ha2.example.com/api/v2/alerts/groups",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://ha2.example.com/api/v2/silences",
					code: 500,
					body: "[]",
				},
			},
			upstreams: []config.AlertmanagerConfig{
				{
					Cluster:  "Errors",
					Name:     "ha1",
					URI:      "http://ha1.example.com",
					Proxy:    false,
					ReadOnly: false,
					Headers:  map[string]string{},
					CORS: config.AlertmanagerCORS{
						Credentials: "omit",
					},
					Timeout: time.Second * 10,
				},
				{
					Cluster:  "Errors",
					Name:     "ha2",
					URI:      "http://ha2.example.com",
					Proxy:    false,
					ReadOnly: true,
					Headers:  map[string]string{},
					CORS: config.AlertmanagerCORS{
						Credentials: "omit",
					},
					Timeout: time.Second * 10,
				},
			},
			status: models.AlertmanagerAPISummary{
				Counters: models.AlertmanagerAPICounters{
					Total:   2,
					Healthy: 1,
					Failed:  1,
				},
				Instances: []models.AlertmanagerAPIStatus{
					{
						Name:            "ha1",
						URI:             "http://ha1.example.com",
						PublicURI:       "http://ha1.example.com",
						ReadOnly:        false,
						Headers:         map[string]string{},
						CORSCredentials: "omit",
						Error:           "",
						Version:         "",
						Cluster:         "Errors",
						ClusterMembers:  []string{"ha1", "ha2"},
					},
					{
						Name:            "ha2",
						URI:             "http://ha2.example.com",
						PublicURI:       "http://ha2.example.com",
						ReadOnly:        true,
						Headers:         map[string]string{},
						CORSCredentials: "omit",
						Error:           "json: cannot unmarshal array into Go value of type string",
						Version:         "0.21.0",
						Cluster:         "Errors",
						ClusterMembers:  []string{"ha1", "ha2"},
					},
				},
				Clusters: map[string][]string{
					"Errors": {"ha1", "ha2"},
				},
			},
		},
		{
			Name: "Single alertmanager from HA Cluster Without Name",
			mocks: []mockT{
				{
					uri:  "http://ha1.example.com/metrics",
					code: 200,
					body: `alertmanager_build_info{version="0.20.0"} 1
					`,
				},
				{
					uri:  "http://ha2.example.com/metrics",
					code: 200,
					body: `alertmanager_build_info{version="0.19.0"} 1`,
				},
				{
					uri:  "http://single.example.com/metrics",
					code: 200,
					body: `alertmanager_build_info{version="0.21.0"} 1
					`,
				},
				{
					uri:  "http://ha1.example.com/api/v2/status",
					code: 200,
					body: `{
	"cluster": {
		"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA",
		"peers": [
			{
				"address": "10.16.0.1:9094",
				"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA"
			},
			{
				"address": "10.16.0.2:9094",
				"name": "BBBBBBBBBBBBBBBBBBBBBBBBBB"
			}
		],
		"status": "ready"
	},
	"versionInfo": {
		"version":"0.20.0"
	}
}`,
				},
				{
					uri:  "http://ha2.example.com/api/v2/status",
					code: 200,
					body: `{
	"cluster": {
		"name": "BBBBBBBBBBBBBBBBBBBBBBBBBB",
		"peers": [
			{
				"address": "10.16.0.1:9094",
				"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA"
			},
			{
				"address": "10.16.0.2:9094",
				"name": "BBBBBBBBBBBBBBBBBBBBBBBBBB"
			}
		],
		"status": "ready"
	},
	"versionInfo": {
		"version":"0.19.0"
	}
}`,
				},
				{
					uri:  "http://single.example.com/api/v2/status",
					code: 200,
					body: `{
	"cluster": {
		"name": "CCCCCCCCCCCCCCCCCCCCCCCCCC",
		"peers": [
			{
				"address": "10.16.0.3:9094",
				"name": "CCCCCCCCCCCCCCCCCCCCCCCCCC"
			}
		],
		"status": "ready"
	},
	"versionInfo": {
		"version":"0.21.0"
	}
}`,
				},
				{
					uri:  "http://ha1.example.com/api/v2/alerts/groups",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://ha1.example.com/api/v2/silences",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://ha2.example.com/api/v2/alerts/groups",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://ha2.example.com/api/v2/silences",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://single.example.com/api/v2/alerts/groups",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://single.example.com/api/v2/silences",
					code: 200,
					body: "[]",
				},
			},
			upstreams: []config.AlertmanagerConfig{
				{
					Name:     "ha1",
					URI:      "http://ha1.example.com",
					Proxy:    false,
					ReadOnly: false,
					Headers:  map[string]string{},
					CORS: config.AlertmanagerCORS{
						Credentials: "same-site",
					},
					Timeout: time.Second * 10,
				},
				{
					Name:     "single",
					URI:      "http://single.example.com",
					Proxy:    false,
					ReadOnly: true,
					Headers:  map[string]string{},
					CORS: config.AlertmanagerCORS{
						Credentials: "same-site",
					},
					Timeout: time.Second * 10,
				},
			},
			status: models.AlertmanagerAPISummary{
				Counters: models.AlertmanagerAPICounters{
					Total:   2,
					Healthy: 2,
					Failed:  0,
				},
				Instances: []models.AlertmanagerAPIStatus{
					{
						Name:            "ha1",
						URI:             "http://ha1.example.com",
						PublicURI:       "http://ha1.example.com",
						ReadOnly:        false,
						Headers:         map[string]string{},
						CORSCredentials: "same-site",
						Error:           "",
						Version:         "0.20.0",
						Cluster:         "ha1",
						ClusterMembers:  []string{"ha1"},
					},
					{
						Name:            "single",
						URI:             "http://single.example.com",
						PublicURI:       "http://single.example.com",
						ReadOnly:        true,
						Headers:         map[string]string{},
						CORSCredentials: "same-site",
						Error:           "",
						Version:         "0.21.0",
						Cluster:         "single",
						ClusterMembers:  []string{"single"},
					},
				},
				Clusters: map[string][]string{
					"ha1":    {"ha1"},
					"single": {"single"},
				},
			},
		},
		{
			Name: "Single alertmanager with unparsable metrics",
			mocks: []mockT{
				{
					uri:  "http://only.example.com/metrics",
					code: 200,
					body: `alertmanager_build_info{version="0.20.0"`,
				},
				{
					uri:  "http://only.example.com/api/v2/status",
					code: 200,
					body: `{
	"cluster": {
		"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA",
		"peers": [
			{
				"address": "10.16.0.1:9094",
				"name": "AAAAAAAAAAAAAAAAAAAAAAAAAA"
			}
		],
		"status": "ready"
	},
	"versionInfo": {
		"version":"0.20.0"
	}
}`,
				},
				{
					uri:  "http://only.example.com/api/v2/alerts/groups",
					code: 200,
					body: "[]",
				},
				{
					uri:  "http://only.example.com/api/v2/silences",
					code: 200,
					body: "[]",
				},
			},
			upstreams: []config.AlertmanagerConfig{
				{
					Name:     "only",
					URI:      "http://only.example.com",
					Proxy:    false,
					ReadOnly: false,
					Headers:  map[string]string{},
					CORS: config.AlertmanagerCORS{
						Credentials: "same-site",
					},
					Timeout: time.Second * 10,
				},
			},
			status: models.AlertmanagerAPISummary{
				Counters: models.AlertmanagerAPICounters{
					Total:   1,
					Healthy: 1,
					Failed:  0,
				},
				Instances: []models.AlertmanagerAPIStatus{
					{
						Name:            "only",
						URI:             "http://only.example.com",
						PublicURI:       "http://only.example.com",
						ReadOnly:        false,
						Headers:         map[string]string{},
						CORSCredentials: "same-site",
						Error:           "",
						Version:         "",
						Cluster:         "only",
						ClusterMembers:  []string{"only"},
					},
				},
				Clusters: map[string][]string{
					"only": {"only"},
				},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.Name, func(t *testing.T) {
			zerolog.SetGlobalLevel(zerolog.FatalLevel)

			httpmock.Activate()
			defer httpmock.DeactivateAndReset()

			config.Config.Listen.Prefix = "/"
			config.Config.Authentication.Header.Name = ""
			config.Config.Authentication.BasicAuth.Users = []config.AuthenticationUser{}

			apiCache, _ = lru.New(100)
			alertmanager.UnregisterAll()
			upstreamSetup = false
			config.Config.Alertmanager.Servers = testCase.upstreams
			err := setupUpstreams()
			if err != nil {
				t.Error(err)
			}
			r := testRouter()
			setupRouter(r, nil)

			httpmock.Reset()
			for _, m := range testCase.mocks {
				httpmock.RegisterResponder("GET", m.uri, httpmock.NewStringResponder(m.code, m.body))
			}
			pullFromAlertmanager()

			req := httptest.NewRequest("GET", "/alerts.json?q=@receiver=by-cluster-service&q=alertname=HTTP_Probe_Failed&q=instance=web1", nil)
			resp := httptest.NewRecorder()
			r.ServeHTTP(resp, req)
			if resp.Code != http.StatusOK {
				t.Errorf("GET /alerts.json returned status %d", resp.Code)
			}

			ur := models.AlertsResponse{}
			err = json.Unmarshal(resp.Body.Bytes(), &ur)
			if err != nil {
				t.Errorf("Failed to unmarshal response: %s", err)
			}
			if diff := cmp.Diff(testCase.status, ur.Upstreams, cmp.Comparer(
				func(x, y string) bool {
					if strings.HasPrefix(x, "^") {
						reX, err := regexp.Compile(x)
						if err == nil {
							return reX.MatchString(y)
						}
					}
					if strings.HasPrefix(y, "^") {
						reY, err := regexp.Compile(y)
						if err == nil {
							return reY.MatchString(x)
						}
					}
					return x == y
				}),
			); diff != "" {
				t.Errorf("Wrong upstream summary returned (-want +got):\n%s", diff)
			}
		})
	}
}

func TestGetUserFromContextMissing(t *testing.T) {
	req := httptest.NewRequest("GET", "/alerts.json", nil)
	user := getUserFromContext(req)
	if user != "" {
		t.Errorf("getUserFromContext() returned user=%q", user)
	}
}

func TestGetUserFromContextPresent(t *testing.T) {
	req := httptest.NewRequest("GET", "/alerts.json", nil)
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
				mock.RegisterURL("http://localhost/api/v2/status", version, "api/v2/status")
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

				_ = am.Pull()
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

				httpmock.Activate()
				defer httpmock.DeactivateAndReset()

				mockCache()

				alertmanager.UnregisterAll()
				upstreamSetup = false

				mock.RegisterURL("http://localhost/c1a/metrics", version, "metrics")
				mock.RegisterURL("http://localhost/c1a/api/v2/status", version, "api/v2/status")
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
				mock.RegisterURL("http://localhost/c1b/api/v2/status", version, "api/v2/status")
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
				mock.RegisterURL("http://localhost/c2a/api/v2/status", version, "api/v2/status")
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

				r := testRouter()
				setupRouter(r, nil)
				// re-run a few times to test the cache
				for i := 1; i <= 3; i++ {
					req := httptest.NewRequest("GET", fmt.Sprintf("/alerts.json?%s", q), nil)
					resp := httptest.NewRecorder()
					r.ServeHTTP(resp, req)
					if resp.Code != http.StatusOK {
						t.Errorf("GET /alerts.json returned status %d", resp.Code)
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
		q         string
		gridLabel string
		ignore    []string
		order     []string
	}

	testCases := []testCaseT{
		{
			q:         "",
			gridLabel: "",
		},
		{
			q:         "gridLabel=@auto",
			gridLabel: "job",
		},
		{
			q:         "gridLabel=@auto&q=cluster!=prod",
			gridLabel: "cluster",
			ignore:    []string{"job"},
			order:     []string{"cluster"},
		},
		{
			q:         "gridLabel=@auto&q=cluster!=prod",
			gridLabel: "cluster",
			ignore:    []string{},
			order:     []string{"cluster"},
		},
		{
			q:         "gridLabel=@auto&q=cluster!=prod",
			gridLabel: "job",
			ignore:    []string{},
			order:     []string{"job", "cluster"},
		},
		{
			q:         "gridLabel=@auto&q=job=node_exporter",
			gridLabel: "cluster",
			ignore:    []string{},
			order:     []string{"job", "cluster"},
		},
		{
			q:         "gridLabel=@auto&q=cluster=dev",
			gridLabel: "job",
			ignore:    []string{},
			order:     []string{"job", "cluster"},
		},
		{
			q:         "gridLabel=@auto&q=cluster=dev",
			gridLabel: "alertname",
			ignore:    []string{},
			order:     []string{},
		},
		{
			q:         "gridLabel=job",
			gridLabel: "job",
		},
		{
			q:         "gridLabel=@auto&q=instance=server5",
			gridLabel: "job",
			ignore:    []string{"alertname"},
		},
		{
			q:         "gridLabel=@auto&q=job=node_exporter",
			gridLabel: "cluster",
			ignore:    []string{"alertname"},
		},
		{
			q:         "gridLabel=@auto&q=cluster=prod",
			gridLabel: "job",
			ignore:    []string{"alertname", "instance"},
		},
	}

	defer func() {
		config.Config.Grid.Auto.Ignore = []string{}
		config.Config.Grid.Auto.Order = []string{}
	}()

	mockConfig()
	for _, tc := range testCases {
		config.Config.Grid.Auto.Ignore = tc.ignore
		config.Config.Grid.Auto.Order = tc.order
		for _, version := range mock.ListAllMocks() {
			t.Logf("Testing alerts using mock files from Alertmanager %s", version)
			mockAlerts(version)
			r := testRouter()
			setupRouter(r, nil)
			// re-run a few times to test the cache
			for i := 1; i <= 3; i++ {
				req := httptest.NewRequest("GET", fmt.Sprintf("/alerts.json?%s", tc.q), nil)
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
					t.Errorf("[%s] Got empty grid list", tc.q)
				}
				for _, g := range ur.Grids {
					if g.LabelName != tc.gridLabel {
						t.Errorf("[%s] Got grid using label %s=%s, expected %s", tc.q, g.LabelName, g.LabelValue, tc.gridLabel)
					}
				}
			}
		}
	}
}
