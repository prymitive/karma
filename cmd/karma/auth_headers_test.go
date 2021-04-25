package main

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	lru "github.com/hashicorp/golang-lru"
	"github.com/jarcoal/httpmock"
	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/mock"
)

type authHeaderTest struct {
	alertmanagerURI  string
	alertmanagerHost string
	authUser         string
	authPass         string
	headers          map[string]string
}

var authHeaderTests = []authHeaderTest{
	{
		alertmanagerURI:  "http://localhost:9093",
		alertmanagerHost: "localhost:9093",
	},
	{
		alertmanagerURI:  "http://alertmanager.example.com",
		alertmanagerHost: "alertmanager.example.com",
	},
	{
		alertmanagerURI:  "http://foo:bar@alertmanager.example.com",
		alertmanagerHost: "alertmanager.example.com",
		authUser:         "foo",
		authPass:         "bar",
	},
	{
		alertmanagerURI:  "http://foo@alertmanager.example.com",
		alertmanagerHost: "alertmanager.example.com",
		authUser:         "foo",
		authPass:         "",
	},
	{
		alertmanagerURI:  "http://alertmanager.example.com",
		alertmanagerHost: "alertmanager.example.com",
		headers:          map[string]string{"X-Foo": "Bar", "X-Auth": "None"},
	},
	{
		alertmanagerURI:  "http://foo@alertmanager.example.com",
		alertmanagerHost: "alertmanager.example.com",
		headers:          map[string]string{"X-Foo": "Bar", "X-Auth": "None"},
	},
	{
		alertmanagerURI:  "http://foo:bar@alertmanager.example.com",
		alertmanagerHost: "alertmanager.example.com",
		headers:          map[string]string{"X-Foo": "Bar", "X-Auth": "None"},
	},
}

func TestAuthHeader(t *testing.T) {
	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	for _, testCase := range authHeaderTests {
		testCase := testCase //scopelint pin
		for _, version := range mock.ListAllMocks() {
			apiCache, _ = lru.New(100)

			am, err := alertmanager.NewAlertmanager(
				"cluster",
				fmt.Sprintf("testAuthHeader/%s", version),
				testCase.alertmanagerURI,
				alertmanager.WithRequestTimeout(time.Second*5),
				alertmanager.WithHTTPHeaders(testCase.headers),
			)
			if err != nil {
				t.Error(err)
			}

			httpmock.Reset()

			for _, m := range []string{
				"metrics",
				"api/v2/status",
				"api/v2/silences",
				"api/v2/alerts/groups"} {

				uri := fmt.Sprintf("%s/%s", testCase.alertmanagerURI, m)

				responder := mock.GetMockResponder(uri, version, m)
				httpmock.RegisterResponder("GET", uri,
					func(req *http.Request) (*http.Response, error) {
						if req.Host != testCase.alertmanagerHost {
							t.Errorf("req.Host is '%s' while '%s' was expected", req.Host, testCase.alertmanagerHost)
						}
						if req.Header.Get("Host") != "" {
							t.Errorf("req.Header.Host is '%s' while '%s' was expected", req.Header.Get("Host"), testCase.alertmanagerHost)
						}
						if testCase.authUser != "" || testCase.authPass != "" {
							user, password, _ := req.BasicAuth()
							if testCase.authUser != "" && testCase.authUser != user {
								t.Errorf("%s was expected to have Basic Auth user '%s', got '%s'",
									testCase.alertmanagerURI, testCase.authUser, user)
							}
							if testCase.authPass != "" && testCase.authPass != password {
								t.Errorf("%s was expected to have Basic Auth password '%s', got '%s'",
									testCase.alertmanagerURI, testCase.authPass, password)
							}
						}
						for k, v := range testCase.headers {
							if req.Header.Get(k) != v {
								t.Errorf("%s was expecting headers %s=%s, got %s", testCase.alertmanagerURI, k, v, req.Header.Get(k))
							}
						}
						return responder(req)
					})
			}

			_ = am.Pull()
		}
	}
}
