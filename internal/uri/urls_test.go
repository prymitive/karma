package uri_test

import (
	"testing"

	"github.com/prymitive/karma/internal/uri"
)

type joinURLTest struct {
	base    string
	sub     string
	url     string
	isValid bool
}

var joinURLTests = []joinURLTest{
	{
		base:    "http://localhost",
		sub:     "/sub",
		url:     "http://localhost/sub",
		isValid: true,
	},
	{
		base:    "http://localhost",
		sub:     "/sub/",
		url:     "http://localhost/sub",
		isValid: true,
	},
	{
		base:    "http://am.example.com",
		sub:     "/api/v2/alerts",
		url:     "http://am.example.com/api/v2/alerts",
		isValid: true,
	},
	{
		base:    "%gh&%ij",
		sub:     "/a + b",
		url:     "",
		isValid: false,
	},
}

func TestJoinURL(t *testing.T) {
	for _, testCase := range joinURLTests {
		url, err := uri.JoinURL(testCase.base, testCase.sub)
		if err != nil && testCase.isValid {
			t.Errorf("joinURL(%v, %v) failed: %s", testCase.base, testCase.sub, err.Error())
		}
		if err == nil && !testCase.isValid {
			t.Errorf("expected error for '%s' and '%s' but got '%s'", testCase.base, testCase.sub, url)
		}
		if url != testCase.url {
			t.Errorf("Invalid joined url from '%s' + '%s', expected '%s', got '%s'", testCase.base, testCase.sub, testCase.url, url)
		}
	}
}

type sanitizeURITest struct {
	raw       string
	sanitized string
}

var sanitizeURITests = []sanitizeURITest{
	{
		raw:       "http://alertmanager.example.com",
		sanitized: "http://alertmanager.example.com",
	},
	{
		raw:       "http://alertmanager.example.com/foo",
		sanitized: "http://alertmanager.example.com/foo",
	},
	{
		raw:       "http://user:pass@alertmanager.example.com",
		sanitized: "http://user:xxx@alertmanager.example.com",
	},
	{
		raw:       "http://user:pass@alertmanager.example.com/foo",
		sanitized: "http://user:xxx@alertmanager.example.com/foo",
	},
	{
		raw:       "https://alertmanager.example.com",
		sanitized: "https://alertmanager.example.com",
	},
	{
		raw:       "https://alertmanager.example.com/foo",
		sanitized: "https://alertmanager.example.com/foo",
	},
	{
		raw:       "https://user:pass@alertmanager.example.com",
		sanitized: "https://user:xxx@alertmanager.example.com",
	},
	{
		raw:       "https://user:pass@alertmanager.example.com/foo",
		sanitized: "https://user:xxx@alertmanager.example.com/foo",
	},
	{
		raw:       "%gh&%ij",
		sanitized: "%gh&%ij",
	},
}

func TestSanitizedURI(t *testing.T) {
	for _, test := range sanitizeURITests {
		s := uri.SanitizeURI(test.raw)
		if s != test.sanitized {
			t.Errorf("Sanitized URI mismatch, expected '%s' => '%s', got '%s'",
				test.raw, test.sanitized, s)
		}
	}
}

func TestHeadersForBasicAuth(t *testing.T) {
	type headersTest struct {
		uri   string
		isSet bool
		value string
	}
	testCases := []headersTest{
		{
			uri:   "http://localhost.com",
			isSet: false,
		},
		{
			uri:   "http://user@localhost.com",
			isSet: false,
		},
		{
			uri:   "http://user:pass@localhost.com",
			isSet: true,
			value: "Basic dXNlcjpwYXNz",
		},
		{
			uri:   "%gh&%ij",
			isSet: false,
		},
	}
	for _, test := range testCases {
		headers := uri.HeadersForBasicAuth(test.uri)
		value, isSet := headers["Authorization"]
		if isSet != test.isSet {
			t.Errorf("[%s] expected Authorization header: %v, was set: %v", test.uri, test.isSet, isSet)
		}
		if value != test.value {
			t.Errorf("[%s] expected Authorization value: %s, value: %s", test.uri, test.value, value)
		}
	}
}

func TestURIWithoutUserinfo(t *testing.T) {
	type userinfoTest struct {
		uri    string
		parsed string
	}
	testCases := []userinfoTest{
		{uri: "http://localhost", parsed: "http://localhost"},
		{uri: "http://localhost?foo=bar", parsed: "http://localhost?foo=bar"},
		{uri: "http://user@localhost", parsed: "http://localhost"},
		{uri: "http://user:pass@localhost", parsed: "http://localhost"},
		{uri: "http://user:pass@localhost?foo=bar#1", parsed: "http://localhost?foo=bar#1"},
		{uri: "%gh&%ij", parsed: "%gh&%ij"},
	}

	for _, test := range testCases {
		parsed := uri.WithoutUserinfo(test.uri)
		if parsed != test.parsed {
			t.Errorf("'%s' got parsed as '%s', expected: '%s'", test.uri, parsed, test.parsed)
		}
	}
}
