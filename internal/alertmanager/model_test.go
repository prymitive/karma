package alertmanager

import (
	"testing"
)

type uriTest struct {
	rawURI    string
	extURI    string
	proxy     bool
	publicURI string
}

var uriTests = []uriTest{
	{
		rawURI:    "http://alertmanager.example.com",
		proxy:     false,
		publicURI: "http://alertmanager.example.com",
	},
	{
		rawURI:    "http://alertmanager.example.com/foo",
		proxy:     false,
		publicURI: "http://alertmanager.example.com/foo",
	},
	{
		rawURI:    "http://alertmanager.example.com",
		proxy:     true,
		publicURI: "/proxy/alertmanager/test",
	},
	{
		rawURI:    "http://alertmanager.example.com/foo",
		proxy:     true,
		publicURI: "/proxy/alertmanager/test",
	},
	{
		rawURI:    "http://user:pass@alertmanager.example.com",
		proxy:     false,
		publicURI: "http://alertmanager.example.com",
	},
	{
		rawURI:    "https://user:pass@alertmanager.example.com/foo",
		proxy:     false,
		publicURI: "https://alertmanager.example.com/foo",
	},
	{
		rawURI:    "http://user:pass@alertmanager.example.com",
		proxy:     true,
		publicURI: "/proxy/alertmanager/test",
	},
	{
		rawURI:    "http://user:pass@alertmanager.example.com",
		extURI:    "http://am.example.com",
		proxy:     true,
		publicURI: "/proxy/alertmanager/test",
	},
	{
		rawURI:    "http://alertmanager.example.com",
		extURI:    "http://am.example.com",
		proxy:     true,
		publicURI: "/proxy/alertmanager/test",
	},
	{
		rawURI:    "http://user:pass@alertmanager.example.com",
		extURI:    "http://am.example.com",
		proxy:     false,
		publicURI: "http://am.example.com",
	},
	{
		rawURI:    "http://alertmanager.example.com",
		extURI:    "http://am.example.com",
		proxy:     false,
		publicURI: "http://am.example.com",
	},
}

func TestAlertmanagerURI(t *testing.T) {
	for _, test := range uriTests {
		am, err := NewAlertmanager("test", test.rawURI, WithExternalURI(test.extURI), WithProxy(test.proxy))
		if err != nil {
			t.Error(err)
		}
		if am.PublicURI() != test.publicURI {
			t.Errorf("Public URI mismatch, expected '%s' => '%s', got '%s' (proxy: %v)",
				test.rawURI, test.publicURI, am.PublicURI(), test.proxy)
		}
	}
}
