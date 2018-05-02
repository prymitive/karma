package alertmanager

import (
	"testing"
)

type uriTest struct {
	rawURI    string
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
		publicURI: "http://user:pass@alertmanager.example.com",
	},
	{
		rawURI:    "https://user:pass@alertmanager.example.com/foo",
		proxy:     false,
		publicURI: "https://user:pass@alertmanager.example.com/foo",
	},
	{
		rawURI:    "http://user:pass@alertmanager.example.com",
		proxy:     true,
		publicURI: "/proxy/alertmanager/test",
	},
}

func TestAlertmanagerURI(t *testing.T) {
	for _, test := range uriTests {
		am, err := NewAlertmanager("test", test.rawURI, WithProxy(test.proxy))
		if err != nil {
			t.Error(err)
		}
		if am.publicURI() != test.publicURI {
			t.Errorf("Public URI mismatch, expected '%s' => '%s', got '%s' (proxy: %v)",
				test.rawURI, test.publicURI, am.publicURI(), test.proxy)
		}
	}
}
