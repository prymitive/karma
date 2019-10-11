package alertmanager

import (
	"testing"
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
		internalURI: "/proxy/alertmanager/test",
		publicURI:   "http://alertmanager.example.com",
	},
	{
		rawURI:      "http://alertmanager.example.com/foo",
		proxy:       true,
		internalURI: "/proxy/alertmanager/test",
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
		internalURI: "/proxy/alertmanager/test",
		publicURI:   "http://user:pass@alertmanager.example.com",
	},
	{
		rawURI:      "http://user:pass@alertmanager.example.com",
		extURI:      "http://am.example.com",
		proxy:       true,
		internalURI: "/proxy/alertmanager/test",
		publicURI:   "http://am.example.com",
	},
	{
		rawURI:      "http://alertmanager.example.com",
		extURI:      "http://am.example.com",
		proxy:       true,
		internalURI: "/proxy/alertmanager/test",
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
		am, err := NewAlertmanager("test", test.rawURI, WithExternalURI(test.extURI), WithProxy(test.proxy))
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
