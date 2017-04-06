package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/cloudflare/unsee/config"
	"github.com/cloudflare/unsee/mock"
	"github.com/cloudflare/unsee/models"

	log "github.com/Sirupsen/logrus"
	"github.com/gin-gonic/gin"
	cache "github.com/patrickmn/go-cache"

	"gopkg.in/jarcoal/httpmock.v1"
)

var testVersions = []string{"0.4", "0.5"}

func mockConfig() {
	log.SetLevel(log.ErrorLevel)
	os.Setenv("ALERTMANAGER_URI", "http://localhost")
	os.Setenv("COLOR_LABELS_UNIQUE", "alertname")
	config.Config.Read()
}

func ginTestEngine() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.SetHTMLTemplate(loadTemplates("templates"))
	setupRouter(r)
	return r
}

func TestIndex(t *testing.T) {
	mockConfig()
	r := ginTestEngine()
	req, _ := http.NewRequest("GET", "/", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusOK {
		t.Errorf("GET / returned status %d", resp.Code)
	}
}

func TestIndexPrefix(t *testing.T) {
	os.Setenv("WEB_PREFIX", "/prefix")
	defer os.Unsetenv("WEB_PREFIX")
	mockConfig()
	r := ginTestEngine()
	req, _ := http.NewRequest("GET", "/prefix/", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusOK {
		t.Errorf("GET /prefix/ returned status %d", resp.Code)
	}
}

func TestHelp(t *testing.T) {
	mockConfig()
	r := ginTestEngine()
	req, _ := http.NewRequest("GET", "/help", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusOK {
		t.Errorf("GET /help returned status %d", resp.Code)
	}
}

func TestHelpPrefix(t *testing.T) {
	os.Setenv("WEB_PREFIX", "/prefix")
	defer os.Unsetenv("WEB_PREFIX")
	mockConfig()
	r := ginTestEngine()
	req, _ := http.NewRequest("GET", "/prefix/help", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusOK {
		t.Errorf("GET /prefix/help returned status %d", resp.Code)
	}
	req, _ = http.NewRequest("GET", "/help", nil)
	resp = httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusNotFound {
		t.Errorf("GET /help returned status %d, expected 404", resp.Code)
	}
}

func mockAlerts(version string) {
	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	apiCache = cache.New(cache.NoExpiration, 10*time.Second)

	mock.RegisterURL("http://localhost/api/v1/status", version, "status")
	mock.RegisterURL("http://localhost/api/v1/silences", version, "silences")
	mock.RegisterURL("http://localhost/api/v1/alerts/groups", version, "alerts/groups")

	PullFromAlertmanager()
}

func TestAlerts(t *testing.T) {
	mockConfig()
	for _, version := range testVersions {
		mockAlerts(version)
		r := ginTestEngine()
		req, _ := http.NewRequest("GET", "/alerts.json?q=alertname=HTTP_Probe_Failed,instance=web1", nil)
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != http.StatusOK {
			t.Errorf("GET /alerts.json returned status %d", resp.Code)
		}

		ur := models.UnseeAlertsResponse{}
		json.Unmarshal(resp.Body.Bytes(), &ur)
		if len(ur.Filters) != 2 {
			t.Errorf("[%s] No filters in response", version)
		}
		if len(ur.Colors) != 1 {
			t.Errorf("[%s] No colors in response", version)
		}
		if len(ur.Silences) != 1 {
			t.Errorf("[%s] No silences in response", version)
		}
		if len(ur.AlertGroups) != 1 {
			t.Errorf("[%s] No alerts in response", version)
		}
		if ur.Version == "" {
			t.Errorf("[%s] No version in response", version)
		}
		if ur.Timestamp == "" {
			t.Errorf("[%s] No timestamp in response", version)
		}
		if ur.Error != "" {
			t.Errorf("[%s] Error in response: %s", version, ur.Error)
		}
		if ur.Status != "success" {
			t.Errorf("[%s] Invalid status in response: %s", version, ur.Status)
		}
		if len(ur.Counters) != 5 {
			t.Errorf("[%s] Invalid number of counters in response (%d): %v", version, len(ur.Counters), ur.Counters)
		}
		for _, ag := range ur.AlertGroups {
			for _, a := range ag.Alerts {
				if len(a.Links) != 1 {
					t.Errorf("Invalid number of links, got %d, expected 1, %v", len(a.Links), a)
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
	acTestCase{
		Term: "a",
		Results: []string{
			"@age<10m",
			"@age<1h",
			"@age>10m",
			"@age>1h",
			"alertname!=Free_Disk_Space_Too_Low",
			"alertname!=HTTP_Probe_Failed",
			"alertname!=Host_Down",
			"alertname!=Memory_Usage_Too_High",
			"alertname=Free_Disk_Space_Too_Low",
			"alertname=HTTP_Probe_Failed",
			"alertname=Host_Down",
			"alertname=Memory_Usage_Too_High",
		},
	},
	acTestCase{
		Term: "alert",
		Results: []string{
			"alertname!=Free_Disk_Space_Too_Low",
			"alertname!=HTTP_Probe_Failed",
			"alertname!=Host_Down",
			"alertname!=Memory_Usage_Too_High",
			"alertname=Free_Disk_Space_Too_Low",
			"alertname=HTTP_Probe_Failed",
			"alertname=Host_Down",
			"alertname=Memory_Usage_Too_High",
		},
	},
	acTestCase{
		Term: "alertname",
		Results: []string{
			"alertname!=Free_Disk_Space_Too_Low",
			"alertname!=HTTP_Probe_Failed",
			"alertname!=Host_Down",
			"alertname!=Memory_Usage_Too_High",
			"alertname=Free_Disk_Space_Too_Low",
			"alertname=HTTP_Probe_Failed",
			"alertname=Host_Down",
			"alertname=Memory_Usage_Too_High",
		},
	},
	acTestCase{
		Term: "aLeRtNaMe",
		Results: []string{
			"alertname!=Free_Disk_Space_Too_Low",
			"alertname!=HTTP_Probe_Failed",
			"alertname!=Host_Down",
			"alertname!=Memory_Usage_Too_High",
			"alertname=Free_Disk_Space_Too_Low",
			"alertname=HTTP_Probe_Failed",
			"alertname=Host_Down",
			"alertname=Memory_Usage_Too_High",
		},
	},
	acTestCase{
		Term: "http",
		Results: []string{
			"alertname!=HTTP_Probe_Failed",
			"alertname=HTTP_Probe_Failed",
		},
	},
	acTestCase{
		Term: "hTTp_",
		Results: []string{
			"alertname!=HTTP_Probe_Failed",
			"alertname=HTTP_Probe_Failed",
		},
	},
	acTestCase{
		Term: "@",
		Results: []string{
			"@age<10m",
			"@age<1h",
			"@age>10m",
			"@age>1h",
			"@limit=10",
			"@limit=50",
			"@silence_author!=john@example.com",
			"@silence_author!~john@example.com",
			"@silence_author=john@example.com",
			"@silence_author=~john@example.com",
			"@silenced=false",
			"@silenced=true",
		},
	},
	acTestCase{
		Term: "nod",
		Results: []string{
			"job!=node_exporter",
			"job!=node_ping",
			"job=node_exporter",
			"job=node_ping",
		},
	},
	acTestCase{
		Term: "Nod",
		Results: []string{
			"job!=node_exporter",
			"job!=node_ping",
			"job=node_exporter",
			"job=node_ping",
		},
	},
	// duplicated to test reponse caching
	acTestCase{
		Term: "Nod",
		Results: []string{
			"job!=node_exporter",
			"job!=node_ping",
			"job=node_exporter",
			"job=node_ping",
		},
	},
}

func TestAutocomplete(t *testing.T) {
	mockConfig()
	for _, version := range testVersions {
		mockAlerts(version)
		r := ginTestEngine()

		req, _ := http.NewRequest("GET", "/autocomplete.json", nil)
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != http.StatusBadRequest {
			t.Errorf("Invalid status code for request without any query: %d", resp.Code)
		}

		for _, acTest := range acTests {
			url := fmt.Sprintf("/autocomplete.json?term=%s", acTest.Term)
			req, _ := http.NewRequest("GET", url, nil)
			resp := httptest.NewRecorder()
			r.ServeHTTP(resp, req)

			if resp.Code != http.StatusOK {
				t.Errorf("GET %s returned status %d", url, resp.Code)
			}

			ur := []string{}
			json.Unmarshal(resp.Body.Bytes(), &ur)

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

type staticFileTestCase struct {
	path string
	code int
}

var staticFileTests = []staticFileTestCase{
	staticFileTestCase{
		path: "/favicon.ico",
		code: 200,
	},
	staticFileTestCase{
		path: "/static/unsee.js",
		code: 200,
	},
	staticFileTestCase{
		path: "/static/managed/js/assets.txt",
		code: 200,
	},
	staticFileTestCase{
		path: "/xxx",
		code: 404,
	},
	staticFileTestCase{
		path: "/static/abcd",
		code: 404,
	},
}

func TestStaticFiles(t *testing.T) {
	mockConfig()
	r := ginTestEngine()
	for _, staticFileTest := range staticFileTests {
		req, _ := http.NewRequest("GET", staticFileTest.path, nil)
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != staticFileTest.code {
			t.Errorf("Invalid status code for GET %s: %d", staticFileTest.path, resp.Code)
		}
	}
}

var staticFilePrefixTests = []staticFileTestCase{
	staticFileTestCase{
		path: "/sub/favicon.ico",
		code: 200,
	},
	staticFileTestCase{
		path: "/sub/static/unsee.js",
		code: 200,
	},
	staticFileTestCase{
		path: "/sub/static/managed/js/assets.txt",
		code: 200,
	},
	staticFileTestCase{
		path: "/sub/xxx",
		code: 404,
	},
	staticFileTestCase{
		path: "/sub/static/abcd",
		code: 404,
	},
}

func TestStaticFilesPrefix(t *testing.T) {
	os.Setenv("WEB_PREFIX", "/sub")
	defer os.Unsetenv("WEB_PREFIX")
	mockConfig()
	r := ginTestEngine()
	for _, staticFileTest := range staticFilePrefixTests {
		req, _ := http.NewRequest("GET", staticFileTest.path, nil)
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != staticFileTest.code {
			t.Errorf("Invalid status code for GET %s: %d", staticFileTest.path, resp.Code)
		}
	}
}
