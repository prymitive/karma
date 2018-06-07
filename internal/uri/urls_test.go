package uri_test

import (
	"testing"

	"github.com/prymitive/unsee/internal/uri"
)

type joinURLTest struct {
	base string
	sub  string
	url  string
}

var joinURLTests = []joinURLTest{
	joinURLTest{
		base: "http://localhost",
		sub:  "/sub",
		url:  "http://localhost/sub",
	},
	joinURLTest{
		base: "http://localhost",
		sub:  "/sub/",
		url:  "http://localhost/sub",
	},
	joinURLTest{
		base: "http://am.example.com",
		sub:  "/api/v1/alerts",
		url:  "http://am.example.com/api/v1/alerts",
	},
}

func TestJoinURL(t *testing.T) {
	for _, testCase := range joinURLTests {
		url, err := uri.JoinURL(testCase.base, testCase.sub)
		if err != nil {
			t.Errorf("joinURL(%v, %v) failed: %s", testCase.base, testCase.sub, err.Error())
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
