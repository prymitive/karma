package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"net/http/httptest"
	"os"
	"sort"
	"testing"
	"time"

	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/mock"
	"github.com/prymitive/karma/internal/models"
	"github.com/prymitive/karma/internal/slices"
	"github.com/spf13/pflag"

	cache "github.com/patrickmn/go-cache"
	log "github.com/sirupsen/logrus"

	"github.com/gin-gonic/gin"
	"github.com/google/go-cmp/cmp"
	"github.com/jarcoal/httpmock"
)

var upstreamSetup = false

func mockConfig() {
	log.SetLevel(log.ErrorLevel)
	os.Setenv("ALERTMANAGER_URI", "http://localhost")
	os.Setenv("LABELS_COLOR_UNIQUE", "alertname")

	f := pflag.NewFlagSet(".", pflag.ExitOnError)
	config.SetupFlags(f)
	config.Config.Read(f)

	if !upstreamSetup {
		upstreamSetup = true
		err := setupUpstreams()
		if err != nil {
			log.Fatal(err)
		}
	}
}

func ginTestEngine() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	setupRouter(r)

	var t *template.Template
	t = loadTemplate(t, "ui/build/index.html")
	r.SetHTMLTemplate(t)

	return r
}

func TestHealth(t *testing.T) {
	mockConfig()
	r := ginTestEngine()
	req := httptest.NewRequest("GET", "/health", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusOK {
		t.Errorf("GET /health returned status %d", resp.Code)
	}
}

func TestHealthPrefix(t *testing.T) {
	os.Setenv("LISTEN_PREFIX", "/prefix")
	defer os.Unsetenv("LISTEN_PREFIX")
	mockConfig()
	r := ginTestEngine()
	req := httptest.NewRequest("GET", "/prefix/health", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusOK {
		t.Errorf("GET /prefix/health returned status %d", resp.Code)
	}
}

func TestIndex(t *testing.T) {
	mockConfig()
	r := ginTestEngine()
	req := httptest.NewRequest("GET", "/", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusOK {
		t.Errorf("GET / returned status %d", resp.Code)
	}
}

func TestIndexPrefix(t *testing.T) {
	os.Setenv("LISTEN_PREFIX", "/prefix")
	defer os.Unsetenv("LISTEN_PREFIX")
	mockConfig()
	r := ginTestEngine()
	req := httptest.NewRequest("GET", "/prefix/", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusOK {
		t.Errorf("GET /prefix/ returned status %d", resp.Code)
	}
}

func mockAlerts(version string) {
	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	apiCache = cache.New(cache.NoExpiration, 10*time.Second)

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
		r := ginTestEngine()
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
			if len(ur.Colors) != 1 {
				t.Errorf("[%s] Got %d color(s) in response, expected %d", version, len(ur.Colors), 1)
			}
			if len(ur.AlertGroups) != 1 {
				t.Errorf("[%s] Got %d alert(s) in response, expected %d", version, len(ur.AlertGroups), 1)
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
			for _, ag := range ur.AlertGroups {
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

func TestValidateAllAlerts(t *testing.T) {
	mockConfig()
	for _, version := range mock.ListAllMocks() {
		t.Logf("Validating alerts.json response using mock files from Alertmanager %s", version)
		mockAlerts(version)
		r := ginTestEngine()
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
			for _, ag := range ur.AlertGroups {
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
		r := ginTestEngine()

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

type staticFileTestCase struct {
	path string
	code int
}

var staticFileTests = []staticFileTestCase{
	{
		path: "/favicon.ico",
		code: 200,
	},
	{
		path: "/manifest.json",
		code: 200,
	},
	{
		path: "/index.xml",
		code: 404,
	},
	{
		path: "/xxx",
		code: 404,
	},
	{
		path: "/static/abcd",
		code: 404,
	},
}

func TestStaticFiles(t *testing.T) {
	mockConfig()
	r := ginTestEngine()
	for _, staticFileTest := range staticFileTests {
		req := httptest.NewRequest("GET", staticFileTest.path, nil)
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != staticFileTest.code {
			t.Errorf("Invalid status code for GET %s: %d", staticFileTest.path, resp.Code)
		}
	}
}

var staticFilePrefixTests = []staticFileTestCase{
	{
		path: "/sub/favicon.ico",
		code: 200,
	},
	{
		path: "/sub/manifest.json",
		code: 200,
	},
	{
		path: "/sub/index.xml",
		code: 404,
	},
	{
		path: "/sub/xxx",
		code: 404,
	},
	{
		path: "/sub/static/abcd",
		code: 404,
	},
}

func TestStaticFilesPrefix(t *testing.T) {
	os.Setenv("LISTEN_PREFIX", "/sub")
	defer os.Unsetenv("LISTEN_PREFIX")
	mockConfig()
	r := ginTestEngine()
	for _, staticFileTest := range staticFilePrefixTests {
		req := httptest.NewRequest("GET", staticFileTest.path, nil)
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != staticFileTest.code {
			t.Errorf("Invalid status code for GET %s: %d", staticFileTest.path, resp.Code)
		}
	}
}

func TestGzipMiddleware(t *testing.T) {
	mockConfig()
	r := ginTestEngine()
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
	r := ginTestEngine()
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

func TestValidateAuthorFromHeaders(t *testing.T) {
	type testValidateAuthorFromHeaders struct {
		configHeader       string
		configRegex        string
		requestHeaderName  string
		requestHeaderValue string
		expectedAuthor     string
	}

	testCases := []testValidateAuthorFromHeaders{
		{
			configHeader:       "X-Auth",
			configRegex:        "^(.*)$",
			requestHeaderName:  "X-Auth",
			requestHeaderValue: "foo",
			expectedAuthor:     "foo",
		},
		{
			configHeader:       "X-Auth",
			configRegex:        "^foo(.*)bar$",
			requestHeaderName:  "X-Auth",
			requestHeaderValue: "foo123bar",
			expectedAuthor:     "123",
		},
		{
			configHeader:       "X-Auth",
			configRegex:        "^(.*)$",
			requestHeaderName:  "X-Auth-Not",
			requestHeaderValue: "foo",
			expectedAuthor:     "",
		},
		{
			configHeader:       "",
			configRegex:        "^(.*)$",
			requestHeaderName:  "X-Auth",
			requestHeaderValue: "foo",
			expectedAuthor:     "",
		},
		{
			configHeader:       "X-Auth",
			configRegex:        "",
			requestHeaderName:  "X-Auth",
			requestHeaderValue: "foo",
			expectedAuthor:     "",
		},
		{
			configHeader:       "X-Auth",
			configRegex:        "^.*$",
			requestHeaderName:  "X-Auth",
			requestHeaderValue: "foo",
			expectedAuthor:     "",
		},
	}

	mockConfig()
	for _, testCase := range testCases {
		config.Config.SilenceForm.Author.PopulateFromHeader.Header = testCase.configHeader
		config.Config.SilenceForm.Author.PopulateFromHeader.ValueRegex = testCase.configRegex

		r := ginTestEngine()
		req := httptest.NewRequest("GET", "/alerts.json", nil)
		req.Header.Set(testCase.requestHeaderName, testCase.requestHeaderValue)

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
		if ur.Settings.SilenceForm.Author != testCase.expectedAuthor {
			t.Errorf("Expected author '%s', got '%s', test case: %+v", testCase.expectedAuthor, ur.Settings.SilenceForm.Author, testCase)
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
	}

	mockConfig()
	for _, testCase := range silenceTestCases {
		for _, version := range mock.ListAllMocks() {
			t.Logf("Validating silences.json response using mock files from Alertmanager %s", version)
			mockAlerts(version)
			r := ginTestEngine()
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
					t.Errorf("Wrong silences returned (-want +got):\n%s", diff)
				}
			}
		}
	}
}

func TestCORS(t *testing.T) {
	mockConfig()
	r := ginTestEngine()
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
	r := ginTestEngine()
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
			Author: "",
		},
		AlertAcknowledgement: models.AlertAcknowledgementSettings{
			Enabled:         false,
			DurationSeconds: 900,
			Author:          "karma",
			CommentPrefix:   "ACK!",
		},
	}

	if diff := cmp.Diff(expectedSettings, ur.Settings); diff != "" {
		t.Errorf("Wrong settings returned (-want +got):\n%s", diff)
	}
}

func TestBasicAuth(t *testing.T) {
	config.Config.Authentication.Users = []config.AuthenticationUser{
		{Username: "john", Password: "foobar"},
	}
	r := ginTestEngine()
	for _, path := range []string{"/", "/alerts.json", "/autocomplete.json"} {
		req := httptest.NewRequest("GET", path, nil)
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != 401 {
			t.Errorf("Expected 401 from %s, got %d", path, resp.Code)
		}
	}
}
