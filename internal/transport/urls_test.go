package transport_test

import (
	"testing"

	"github.com/cloudflare/unsee/internal/transport"
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
		url, err := transport.JoinURL(testCase.base, testCase.sub)
		if err != nil {
			t.Errorf("joinURL(%v, %v) failed: %s", testCase.base, testCase.sub, err.Error())
		}
		if url != testCase.url {
			t.Errorf("Invalid joined url from '%s' + '%s', expected '%s', got '%s'", testCase.base, testCase.sub, testCase.url, url)
		}
	}
}
