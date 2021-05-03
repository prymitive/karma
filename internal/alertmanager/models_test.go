package alertmanager

import (
	"fmt"
	"testing"

	"github.com/prymitive/karma/internal/config"

	"github.com/rs/zerolog"
)

type uriTest struct {
	rawURI      string
	extURI      string
	proxy       bool
	internalURI string
	publicURI   string
}

var uriTests = []uriTest{
	{
		rawURI:      "http://alertmanager.example.com",
		proxy:       false,
		internalURI: "http://alertmanager.example.com",
		publicURI:   "http://alertmanager.example.com",
	},
	{
		rawURI:      "http://alertmanager.example.com/foo",
		proxy:       false,
		internalURI: "http://alertmanager.example.com/foo",
		publicURI:   "http://alertmanager.example.com/foo",
	},
	{
		rawURI:      "http://alertmanager.example.com",
		proxy:       true,
		internalURI: "./proxy/alertmanager/test",
		publicURI:   "http://alertmanager.example.com",
	},
	{
		rawURI:      "http://alertmanager.example.com/foo",
		proxy:       true,
		internalURI: "./proxy/alertmanager/test",
		publicURI:   "http://alertmanager.example.com/foo",
	},
	{
		rawURI:      "http://user:pass@alertmanager.example.com",
		proxy:       false,
		internalURI: "http://alertmanager.example.com",
		publicURI:   "http://user:pass@alertmanager.example.com",
	},
	{
		rawURI:      "https://user:pass@alertmanager.example.com/foo",
		proxy:       false,
		internalURI: "https://alertmanager.example.com/foo",
		publicURI:   "https://user:pass@alertmanager.example.com/foo",
	},
	{
		rawURI:      "http://user:pass@alertmanager.example.com",
		proxy:       true,
		internalURI: "./proxy/alertmanager/test",
		publicURI:   "http://user:pass@alertmanager.example.com",
	},
	{
		rawURI:      "http://user:pass@alertmanager.example.com",
		extURI:      "http://am.example.com",
		proxy:       true,
		internalURI: "./proxy/alertmanager/test",
		publicURI:   "http://am.example.com",
	},
	{
		rawURI:      "http://alertmanager.example.com",
		extURI:      "http://am.example.com",
		proxy:       true,
		internalURI: "./proxy/alertmanager/test",
		publicURI:   "http://am.example.com",
	},
	{
		rawURI:      "http://user:pass@alertmanager.example.com",
		extURI:      "http://am.example.com",
		proxy:       false,
		internalURI: "http://am.example.com",
		publicURI:   "http://am.example.com",
	},
	{
		rawURI:      "http://alertmanager.example.com",
		extURI:      "http://am.example.com",
		proxy:       false,
		internalURI: "http://am.example.com",
		publicURI:   "http://am.example.com",
	},
}

func TestAlertmanagerURI(t *testing.T) {
	for i, test := range uriTests {
		am, err := NewAlertmanager("cluster", "test", test.rawURI, WithExternalURI(test.extURI), WithProxy(test.proxy))
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
	err := am.Pull()
	if err == nil {
		t.Error("am.Pull(invalid uri) didn't return any error")
	}
}

func TestAlertmanagerPullAlertsWithInvalidVersion(t *testing.T) {
	zerolog.SetGlobalLevel(zerolog.PanicLevel)
	am, _ := NewAlertmanager("cluster", "test", "http://localhost")
	err := am.pullAlerts("0.0.1")
	if err == nil {
		t.Error("am.pullAlerts(invalid version) didn't return any error")
	}
}

func TestAlertmanagerPullSilencesWithInvalidVersion(t *testing.T) {
	zerolog.SetGlobalLevel(zerolog.PanicLevel)
	am, _ := NewAlertmanager("cluster", "test", "http://localhost")
	err := am.pullSilences("0.0.1")
	if err == nil {
		t.Error("am.pullSilences(invalid version) didn't return any error")
	}
}

func TestAlertmanagerFetchStatusWithInvalidVersion(t *testing.T) {
	zerolog.SetGlobalLevel(zerolog.PanicLevel)
	am, _ := NewAlertmanager("cluster", "test", "http://localhost")
	_, err := am.fetchStatus("0.0.1")
	if err == nil {
		t.Error("am.fetchStatus(invalid version) didn't return any error")
	}
}
