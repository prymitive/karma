package alertmanager

import (
	"fmt"
	"testing"
	"time"

	"github.com/jarcoal/httpmock"

	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/intern"
	"github.com/prymitive/karma/internal/mapper/v017/models"

	"github.com/rs/zerolog"
)

type uriTest struct {
	name        string
	rawURI      string
	extURI      string
	proxy       bool
	internalURI string
	publicURI   string
}

var uriTests = []uriTest{
	{
		name:        "test",
		rawURI:      "http://alertmanager.example.com",
		proxy:       false,
		internalURI: "http://alertmanager.example.com",
		publicURI:   "http://alertmanager.example.com",
	},
	{
		name:        "test",
		rawURI:      "http://alertmanager.example.com/foo",
		proxy:       false,
		internalURI: "http://alertmanager.example.com/foo",
		publicURI:   "http://alertmanager.example.com/foo",
	},
	{
		name:        "test",
		rawURI:      "http://alertmanager.example.com",
		proxy:       true,
		internalURI: "./proxy/alertmanager/test",
		publicURI:   "http://alertmanager.example.com",
	},
	{
		name:        "test",
		rawURI:      "http://alertmanager.example.com/foo",
		proxy:       true,
		internalURI: "./proxy/alertmanager/test",
		publicURI:   "http://alertmanager.example.com/foo",
	},
	{
		name:        "test",
		rawURI:      "http://user:pass@alertmanager.example.com",
		proxy:       false,
		internalURI: "http://alertmanager.example.com",
		publicURI:   "http://user:pass@alertmanager.example.com",
	},
	{
		name:        "test",
		rawURI:      "https://user:pass@alertmanager.example.com/foo",
		proxy:       false,
		internalURI: "https://alertmanager.example.com/foo",
		publicURI:   "https://user:pass@alertmanager.example.com/foo",
	},
	{
		name:        "test",
		rawURI:      "http://user:pass@alertmanager.example.com",
		proxy:       true,
		internalURI: "./proxy/alertmanager/test",
		publicURI:   "http://user:pass@alertmanager.example.com",
	},
	{
		name:        "test",
		rawURI:      "http://user:pass@alertmanager.example.com",
		extURI:      "http://am.example.com",
		proxy:       true,
		internalURI: "./proxy/alertmanager/test",
		publicURI:   "http://am.example.com",
	},
	{
		name:        "test",
		rawURI:      "http://alertmanager.example.com",
		extURI:      "http://am.example.com",
		proxy:       true,
		internalURI: "./proxy/alertmanager/test",
		publicURI:   "http://am.example.com",
	},
	{
		name:        "test",
		rawURI:      "http://user:pass@alertmanager.example.com",
		extURI:      "http://am.example.com",
		proxy:       false,
		internalURI: "http://am.example.com",
		publicURI:   "http://am.example.com",
	},
	{
		name:        "test",
		rawURI:      "http://alertmanager.example.com",
		extURI:      "http://am.example.com",
		proxy:       false,
		internalURI: "http://am.example.com",
		publicURI:   "http://am.example.com",
	},
	{
		name:        "test with (spaces)",
		rawURI:      "http://alertmanager.example.com",
		proxy:       true,
		internalURI: `./proxy/alertmanager/test%20with%20%28spaces%29`,
		publicURI:   "http://alertmanager.example.com",
	},
	{
		name:        "test with  (spaces)",
		rawURI:      "http://alertmanager.example.com",
		proxy:       true,
		internalURI: `./proxy/alertmanager/test%20with%20%20%28spaces%29`,
		publicURI:   "http://alertmanager.example.com",
	},
}

func TestAlertmanagerURI(t *testing.T) {
	for i, test := range uriTests {
		am, err := NewAlertmanager("cluster", test.name, test.rawURI, WithExternalURI(test.extURI), WithProxy(test.proxy))
		if err != nil {
			t.Error(err)
		}
		if am.PublicURI() != test.publicURI {
			t.Errorf("[%d] Public URI mismatch, expected '%s' => '%s', got '%s' (proxy: %v)",
				i, test.rawURI, test.publicURI, am.PublicURI(), test.proxy)
		}
		if am.InternalURI() != test.internalURI {
			t.Errorf("[%d] Internal URI mismatch, expected '%s' => '%s', got '%s' (proxy: %v)",
				i, test.rawURI, test.internalURI, am.InternalURI(), test.proxy)
		}
	}
}

func TestAlertmanagerSilenceByID(t *testing.T) {
	am, err := NewAlertmanager("cluster", "test", "http://localhost")
	if err != nil {
		t.Error(err)
	}

	_, err = am.SilenceByID("foo")
	if err == nil {
		t.Error("am.SilenceByID(foo) didn't return any error")
	}
}

func TestAlertmanagerInternalURI(t *testing.T) {
	type testCaseT struct {
		prefix string
		proxy  bool
		uri    string
	}
	tests := []testCaseT{
		{
			prefix: "/",
			proxy:  false,
			uri:    "http://localhost",
		},
		{
			prefix: "/",
			proxy:  true,
			uri:    "./proxy/alertmanager/default",
		},
		{
			prefix: "/root",
			proxy:  true,
			uri:    "./proxy/alertmanager/default",
		},
		{
			prefix: "/root/",
			proxy:  true,
			uri:    "./proxy/alertmanager/default",
		},
		{
			prefix: "root",
			proxy:  true,
			uri:    "./proxy/alertmanager/default",
		},
		{
			prefix: "root/",
			proxy:  true,
			uri:    "./proxy/alertmanager/default",
		},
	}

	for _, testCase := range tests {
		t.Run(fmt.Sprintf("prefix=%q proxy=%v uri=%q", testCase.prefix, testCase.proxy, testCase.uri), func(t *testing.T) {
			config.Config.Listen.Prefix = testCase.prefix
			am, err := NewAlertmanager("cluster", "default", "http://localhost", WithProxy(testCase.proxy))
			if err != nil {
				t.Error(err)
			}

			uri := am.InternalURI()
			if uri != testCase.uri {
				t.Errorf("am.InternalURI() returned %q, expected %q", uri, testCase.uri)
			}
		})
	}
}

func TestAlertmanagerSanitizedURI(t *testing.T) {
	am, err := NewAlertmanager("cluster", "test", "http://user:pass@localhost")
	if err != nil {
		t.Error(err)
	}

	uri := am.SanitizedURI()
	if uri != "http://user:xxx@localhost" {
		t.Errorf("am.SanitizedURI(http://user:pass@localhost) returned %q", uri)
	}
}

func TestAlertmanagerPullWithInvalidURI(t *testing.T) {
	zerolog.SetGlobalLevel(zerolog.PanicLevel)
	am, _ := NewAlertmanager("cluster", "test", "%gh&%ij")
	err := am.Pull(intern.New())
	if err == nil {
		t.Error("am.Pull(invalid uri) didn't return any error")
	}
}

func TestAlertmanagerPullAlertsWithInvalidVersion(t *testing.T) {
	zerolog.SetGlobalLevel(zerolog.PanicLevel)
	am, _ := NewAlertmanager("cluster", "test", "http://localhost")
	err := am.pullAlerts("0.0.1", intern.New())
	if err == nil {
		t.Error("am.pullAlerts(invalid version) didn't return any error")
	}
}

func TestAlertmanagerPullSilencesWithInvalidVersion(t *testing.T) {
	zerolog.SetGlobalLevel(zerolog.PanicLevel)
	am, _ := NewAlertmanager("cluster", "test", "http://localhost")
	err := am.pullSilences("0.0.1", intern.New())
	if err == nil {
		t.Error("am.pullSilences(invalid version) didn't return any error")
	}
}

func TestExpiredSilences(t *testing.T) {
	config.Config.Silences.Expired = time.Minute * 10

	uri := "http://localhost:9999"
	httpmock.Activate()

	now := time.Now()
	m5 := now.Add(-5 * time.Minute)
	m5b, _ := m5.MarshalJSON()
	m15 := now.Add(-15 * time.Minute)
	m15b, _ := m15.MarshalJSON()
	m25 := now.Add(-25 * time.Minute)
	m25b, _ := m25.MarshalJSON()
	p15 := now.Add(15 * time.Minute)
	p15b, _ := p15.MarshalJSON()

	httpmock.RegisterResponder("GET", fmt.Sprintf("%s/metrics", uri),
		httpmock.NewStringResponder(200, "alertmanager_build_info{version=\"0.22.1\"} 1\n"))
	httpmock.RegisterResponder("GET", fmt.Sprintf("%s/api/v2/silences", uri),
		httpmock.NewStringResponder(200, fmt.Sprintf(`[
{
  "id": "b2396f57-c2c3-4225-958f-70ba933a5d81",
  "status": {
    "state": "expired"
  },
  "startsAt": %s,
  "updatedAt": %s,
  "endsAt": %s,
  "comment": "expired silence",
  "createdBy": "test",
  "matchers": [
    {
      "isEqual": true,
      "isRegex": false,
      "name": "alertname",
      "value": "ExampleAlertAlwaysFiring"
    }
  ]
},
{
	"id": "wrong-matchers",
	"status": {
	  "state": "expired"
	},
	"startsAt": %s,
	"updatedAt": %s,
	"endsAt": %s,
	"comment": "expired silence",
	"createdBy": "test",
	"matchers": [
	  {
		"isEqual": false,
		"isRegex": false,
		"name": "alertname",
		"value": "ExampleAlertAlwaysFiring"
	  }
	]
  },
{
	"id": "wrong-expiry",
	"status": {
	  "state": "expired"
	},
	"startsAt": %s,
	"updatedAt": %s,
	"endsAt": %s,
	"comment": "expired silence",
	"createdBy": "test",
	"matchers": [
	  {
		"isEqual": true,
		"isRegex": false,
		"name": "alertname",
		"value": "ExampleAlertAlwaysFiring"
	  }
	]
  }
]`,
			string(m15b), string(m15b), string(m5b),
			string(m15b), string(m15b), string(m5b),
			string(m25b), string(m25b), string(m15b))))
	httpmock.RegisterResponder("GET", fmt.Sprintf("%s/api/v2/alerts/groups", uri),
		httpmock.NewStringResponder(200, fmt.Sprintf(`[{
  "alerts": [
    {
      "annotations": {},
	  "startsAt": %s,
	  "updatedAt": %s,
      "endsAt": %s,
      "fingerprint": "8b0a45d044ddacec",
      "receivers": [ {"name": "web.hook"} ],
      "status": {
        "inhibitedBy": [],
        "silencedBy": [],
        "state": "active"
      },
      "generatorURL": "http://localhost",
      "labels": {
        "alertname": "ExampleAlertAlwaysFiring",
        "job": "alertmanager"
      }
    }
  ],
  "labels": {
    "alertname": "ExampleAlertAlwaysFiring"
  },
  "receiver": {
    "name": "web.hook"
  }
}]`, string(m25b), string(m25b), string(p15b))))

	am, _ := NewAlertmanager("expired", "expired", uri)

	if err := am.Pull(intern.New()); err != nil {
		t.Error(err)
	}
	alertGroups := am.Alerts()
	if len(alertGroups) != 1 {
		t.Errorf("Expected %d alert groups, got %d", 1, len(alertGroups))
	}
	for _, ag := range alertGroups {
		for _, alert := range ag.Alerts {
			if alert.State == models.AlertStatusStateActive {
				if len(alert.SilencedBy) < 1 {
					t.Errorf("Alert should include expired silence")
				}
				if alert.SilencedBy[0] != "b2396f57-c2c3-4225-958f-70ba933a5d81" {
					t.Errorf("Alerts silenced by wrong silence: %s", alert.SilencedBy[0])
				}
			}
		}
	}
}
