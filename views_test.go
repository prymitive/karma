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
	"github.com/cloudflare/unsee/slices"

	log "github.com/Sirupsen/logrus"
	"github.com/gin-gonic/gin"
	cache "github.com/patrickmn/go-cache"

	"gopkg.in/jarcoal/httpmock.v1"
)

var upstreamSetup = false

func mockConfig() {
	log.SetLevel(log.ErrorLevel)
	os.Setenv("ALERTMANAGER_URIS", "default:http://localhost")
	os.Setenv("COLOR_LABELS_UNIQUE", "alertname")
	config.Config.Read()
	if !upstreamSetup {
		upstreamSetup = true
		setupUpstreams()
	}
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
	req, _ := http.NewRequest("GET", "/?q=", nil)
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

	pullFromAlertmanager()
}

func TestAlerts(t *testing.T) {
	mockConfig()
	for _, version := range mock.ListAllMocks() {
		mockAlerts(version)
		r := ginTestEngine()
		req, _ := http.NewRequest("GET", "/alerts.json?q=@receiver=by-cluster-service,alertname=HTTP_Probe_Failed,instance=web1", nil)
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != http.StatusOK {
			t.Errorf("GET /alerts.json returned status %d", resp.Code)
		}

		ur := models.AlertsResponse{}
		json.Unmarshal(resp.Body.Bytes(), &ur)
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
		if len(ur.Upstreams.Instances) == 0 {
			t.Errorf("[%s] No instances in upstream status: %v", version, ur.Upstreams.Instances)
		}
		if ur.Upstreams.Counters.Failed > 0 {
			t.Errorf("[%s] %d error(s) in upstream status: %v", version, ur.Upstreams.Counters.Failed, ur.Upstreams)
		}
		if ur.Status != "success" {
			t.Errorf("[%s] Invalid status in response: %s", version, ur.Status)
		}
		if len(ur.Counters) != 6 {
			t.Errorf("[%s] Invalid number of counters in response (%d): %v", version, len(ur.Counters), ur.Counters)
		}
		for _, ag := range ur.AlertGroups {
			for _, a := range ag.Alerts {
				if len(a.Links) != 1 {
					t.Errorf("Invalid number of links, got %d, expected 1, %v", len(a.Links), a)
				}
				if a.InhibitedBy == nil {
					t.Errorf("InhibitedBy is nil, %v", a)
				}
				if a.SilencedBy == nil {
					t.Errorf("SilencedBy is nil, %v", a)
				}
			}
		}
	}
}

func TestValidateAllAlerts(t *testing.T) {
	mockConfig()
	for _, version := range mock.ListAllMocks() {
		mockAlerts(version)
		r := ginTestEngine()
		req, _ := http.NewRequest("GET", "/alerts.json?q=alertname=HTTP_Probe_Failed,instance=web1", nil)
		resp := httptest.NewRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != http.StatusOK {
			t.Errorf("GET /alerts.json returned status %d", resp.Code)
		}
		ur := models.AlertsResponse{}
		json.Unmarshal(resp.Body.Bytes(), &ur)
		for _, ag := range ur.AlertGroups {
			for _, a := range ag.Alerts {
				if !slices.StringInSlice(models.AlertStateList, a.State) {
					t.Errorf("Invalid alert status '%s', not in %v", a.State, models.AlertStateList)
				}
				if a.InhibitedBy == nil {
					t.Errorf("InhibitedBy is nil, %v", a)
				}
				if a.SilencedBy == nil {
					t.Errorf("SilencedBy is nil, %v", a)
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
			"alertname=Memory_Usage_Too_High",
			"alertname=Host_Down",
			"alertname=HTTP_Probe_Failed",
			"alertname=Free_Disk_Space_Too_Low",
			"alertname!=Memory_Usage_Too_High",
			"alertname!=Host_Down",
			"alertname!=HTTP_Probe_Failed",
			"alertname!=Free_Disk_Space_Too_Low",
			"@age>1h",
			"@age>10m",
			"@age<1h",
			"@age<10m",
		},
	},
	acTestCase{
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
		},
	},
	acTestCase{
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
	acTestCase{
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
	acTestCase{
		Term: "http",
		Results: []string{
			"alertname=HTTP_Probe_Failed",
			"alertname!=HTTP_Probe_Failed",
		},
	},
	acTestCase{
		Term: "hTTp_",
		Results: []string{
			"alertname=HTTP_Probe_Failed",
			"alertname!=HTTP_Probe_Failed",
		},
	},
	acTestCase{
		Term: "@",
		Results: []string{
			"@state=suppressed",
			"@state=active",
			"@state!=suppressed",
			"@state!=active",
			"@silence_author=~john@example.com",
			"@silence_author=john@example.com",
			"@silence_author!~john@example.com",
			"@silence_author!=john@example.com",
			"@receiver=by-name",
			"@receiver=by-cluster-service",
			"@receiver!=by-name",
			"@receiver!=by-cluster-service",
			"@limit=50",
			"@limit=10",
			"@age>1h",
			"@age>10m",
			"@age<1h",
			"@age<10m",
		},
	},
	acTestCase{
		Term: "nod",
		Results: []string{
			"job=node_ping",
			"job=node_exporter",
			"job!=node_ping",
			"job!=node_exporter",
		},
	},
	acTestCase{
		Term: "Nod",
		Results: []string{
			"job=node_ping",
			"job=node_exporter",
			"job!=node_ping",
			"job!=node_exporter",
		},
	},
	// duplicated to test reponse caching
	acTestCase{
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
