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
	"github.com/cloudflare/unsee/models"

	log "github.com/Sirupsen/logrus"
	"github.com/gin-gonic/gin"
	cache "github.com/patrickmn/go-cache"

	"gopkg.in/jarcoal/httpmock.v1"
)

func mockConfig() {
	log.SetLevel(log.FatalLevel)
	os.Setenv("ALERTMANAGER_URI", "http://localhost")
	os.Setenv("COLOR_LABELS", "alertname")
	config.Config.Read()
}

func ginTestEngine() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.LoadHTMLGlob("templates/*")
	r.GET("/", Index)
	r.GET("/help", Help)
	r.GET("/alerts.json", Alerts)
	r.GET("/autocomplete.json", Autocomplete)
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

func mockAlerts() {
	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	apiCache = cache.New(cache.NoExpiration, 10*time.Second)

	silences := `{
    "status": "success",
    "data": {
      "silences": [
        {
          "id": 1,
          "matchers": [
            {
              "name": "alertname",
              "value": "myService",
              "isRegex": false
            }
          ],
          "startsAt": "2016-11-08T16:30:21Z",
          "endsAt": "2063-04-06T09:22:30Z",
          "createdAt": "2016-11-08T16:30:21Z",
          "createdBy": "john@localhost",
          "comment": "JIRA-3273"
        }
      ],
      "totalSilences": 1100
    }
  }`
	httpmock.RegisterResponder("GET", "http://localhost/api/v1/silences?limit=4294967295", httpmock.NewStringResponder(200, silences))

	alerts := `{
  "status": "success",
  "data": [
    {
      "labels": {
        "alertname": "myService"
      },
      "blocks": [
        {
          "routeOpts": {
            "receiver": "email",
            "groupBy": [
              "cluster"
            ],
            "groupWait": 30000000000,
            "groupInterval": 300000000000,
            "repeatInterval": 10800000000000
          },
          "alerts": [
            {
              "labels": {
                "alertname": "myService",
                "node": "localhost",
                "cluster": "prod"
              },
              "annotations": {
                "dashboard": "https://localhost/dashboard"
              },
              "startsAt": "2016-12-10T18:57:42.308Z",
              "endsAt": "0001-01-01T00:00:00Z",
              "generatorURL": "https://localhost/prometheus",
              "inhibited": false,
              "silenced": 1
            }
          ]
        }
      ]
    }
  ]
  }`
	httpmock.RegisterResponder("GET", "http://localhost/api/v1/alerts/groups", httpmock.NewStringResponder(200, alerts))

	PullFromAlertManager()
}

func TestAlerts(t *testing.T) {
	mockConfig()
	mockAlerts()
	r := ginTestEngine()
	req, _ := http.NewRequest("GET", "/alerts.json?q=alertname=myService", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != http.StatusOK {
		t.Errorf("GET /alerts.json returned status %d", resp.Code)
	}

	ur := models.UnseeAlertsResponse{}
	json.Unmarshal(resp.Body.Bytes(), &ur)
	if len(ur.Filters) != 1 {
		t.Error("No filters in response")
	}
	if len(ur.Colors) != 1 {
		t.Error("No colors in response")
	}
	if len(ur.Silences) != 1 {
		t.Error("No silences in response")
	}
	if len(ur.AlertGroups) != 1 {
		t.Error("No alerts in response")
	}
	if ur.Version == "" {
		t.Error("No version in response")
	}
	if ur.Timestamp == "" {
		t.Error("No timestamp in response")
	}
	if ur.Error != "" {
		t.Errorf("Error in response: %s", ur.Error)
	}
	if ur.Status != "success" {
		t.Errorf("Invalid status in response: %s", ur.Status)
	}
	if len(ur.Counters) != 4 {
		t.Errorf("Invalid number of counters in response (%d): %v", len(ur.Counters), ur.Counters)
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
			"alertname!=myService",
			"alertname=myService",
		},
	},
	acTestCase{
		Term: "alert",
		Results: []string{
			"alertname!=myService",
			"alertname=myService",
		},
	},
	acTestCase{
		Term: "alertname",
		Results: []string{
			"alertname!=myService",
			"alertname=myService",
		},
	},
	acTestCase{
		Term: "aLeRtNaMe",
		Results: []string{
			"alertname!=myService",
			"alertname=myService",
		},
	},
	acTestCase{
		Term: "myservice",
		Results: []string{
			"alertname!=myService",
			"alertname=myService",
		},
	},
	acTestCase{
		Term: "MYservice",
		Results: []string{
			"alertname!=myService",
			"alertname=myService",
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
			"@silence_author!=john@localhost",
			"@silence_author!~john@localhost",
			"@silence_author=john@localhost",
			"@silence_author=~john@localhost",
			"@silenced=false",
			"@silenced=true",
		},
	},
	acTestCase{
		Term: "nod",
		Results: []string{
			"node!=localhost",
			"node=localhost",
		},
	},
	acTestCase{
		Term: "Nod",
		Results: []string{
			"node!=localhost",
			"node=localhost",
		},
	},
}

func TestAutocomplete(t *testing.T) {
	mockConfig()
	mockAlerts()
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
				t.Errorf("Result mismatch, got '%s' when '%s' was expected", ur[i], acTest.Results[i])
			}
		}
	}
}
