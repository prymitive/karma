package main

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
	"time"

	lru "github.com/hashicorp/golang-lru"
	"github.com/jarcoal/httpmock"
	"github.com/pmezard/go-difflib/difflib"
	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/mock"
	"github.com/rs/zerolog"
)

// httptest.NewRecorder() doesn't implement http.CloseNotifier
type closeNotifyingRecorder struct {
	*httptest.ResponseRecorder
	closed chan bool
}

func newCloseNotifyingRecorder() *closeNotifyingRecorder {
	return &closeNotifyingRecorder{
		httptest.NewRecorder(),
		make(chan bool, 1),
	}
}

func (c *closeNotifyingRecorder) CloseNotify() <-chan bool {
	return c.closed
}

type proxyTest struct {
	method      string
	localPath   string
	upstreamURI string
	code        int
	response    string
}

var proxyTests = []proxyTest{
	// valid alertmanager and methods
	{
		method:      "POST",
		localPath:   "/proxy/alertmanager/dummy/api/v2/silences",
		upstreamURI: "http://localhost:9093/api/v2/silences",
		code:        200,
		response:    "{\"status\":\"success\",\"data\":{\"silenceId\":\"d8a61ca8-ee2e-4076-999f-276f1e986bf3\"}}",
	},
	{
		method:      "DELETE",
		localPath:   "/proxy/alertmanager/dummy/api/v2/silence/d8a61ca8-ee2e-4076-999f-276f1e986bf3",
		upstreamURI: "http://localhost:9093/api/v2/silence/d8a61ca8-ee2e-4076-999f-276f1e986bf3",
		code:        200,
		response:    "{\"status\":\"success\"}",
	},
	// invalid alertmanager name
	{
		method:      "POST",
		localPath:   "/proxy/alertmanager/INVALID/api/v2/silences",
		upstreamURI: "",
		code:        404,
		response:    "404 page not found\n",
	},
	{
		method:      "DELETE",
		localPath:   "/proxy/alertmanager/INVALID/api/v2/silence/d8a61ca8-ee2e-4076-999f-276f1e986bf3",
		upstreamURI: "http://localhost:9093/api/v2/silence/d8a61ca8-ee2e-4076-999f-276f1e986bf3",
		code:        404,
		response:    "404 page not found\n",
	},
	// valid alertmanager name, but invalid method
	{
		method:      "GET",
		localPath:   "/proxy/alertmanager/dummy/api/v2/silences",
		upstreamURI: "",
		code:        405,
	},
	{
		method:      "GET",
		localPath:   "/proxy/alertmanager/dummy/api/v2/silence/d8a61ca8-ee2e-4076-999f-276f1e986bf3",
		upstreamURI: "http://localhost:9093/api/v2/silence/d8a61ca8-ee2e-4076-999f-276f1e986bf3",
		code:        405,
	},
}

func TestProxy(t *testing.T) {
	dummySilence := `{
	"comment": "comment",
	"createdBy": "username",
	"startsAt": "2000-02-01T00:00:00.000Z",
	"endsAt": "2000-02-01T00:02:03.000Z",
	"matchers": [{ "isRegex": false, "name": "alertname", "value": "Fake Alert" }]
}`

	config.Config.Listen.Prefix = ""

	r := testRouter()
	am, err := alertmanager.NewAlertmanager(
		"cluster",
		"dummy",
		"http://localhost:9093",
		alertmanager.WithRequestTimeout(time.Second*5),
		alertmanager.WithProxy(true),
	)
	if err != nil {
		t.Error(err)
	}

	setupRouterProxyHandlers(r, am)

	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	for _, testCase := range proxyTests {
		httpmock.Reset()
		if testCase.upstreamURI != "" {
			httpmock.RegisterResponder(testCase.method, testCase.upstreamURI, httpmock.NewStringResponder(testCase.code, testCase.response))
		}
		req := httptest.NewRequest(testCase.method, testCase.localPath, strings.NewReader(dummySilence))
		resp := newCloseNotifyingRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != testCase.code {
			t.Errorf("%s %s proxied to %s returned status %d while %d was expected",
				testCase.method, testCase.localPath, testCase.upstreamURI, resp.Code, testCase.code)
		}
		body := resp.Body.String()
		if body != testCase.response {
			t.Errorf("%s %s proxied to %s returned content '%s' while '%s' was expected",
				testCase.method, testCase.localPath, testCase.upstreamURI, body, testCase.response)
		}
	}
}

type proxyHeaderTest struct {
	method              string
	localPath           string
	upstreamURI         string
	code                int
	alertmanagerURI     string
	alertmanagerHost    string
	alertmanagerHeaders map[string]string
	authUser            string
	authPass            string
}

var proxyHeaderTests = []proxyHeaderTest{
	{
		method:           "POST",
		localPath:        "/proxy/alertmanager/dummy/api/v2/silences",
		upstreamURI:      "http://localhost:9093/api/v2/silences",
		code:             200,
		alertmanagerURI:  "http://localhost:9093",
		alertmanagerHost: "localhost:9093",
		alertmanagerHeaders: map[string]string{
			"X-Foo": "bar",
		},
	},
	{
		method:           "POST",
		localPath:        "/proxy/alertmanager/dummy/api/v2/silences",
		upstreamURI:      "http://alertmanager.example.com/api/v2/silences",
		code:             200,
		alertmanagerURI:  "http://alertmanager.example.com",
		alertmanagerHost: "alertmanager.example.com",
		alertmanagerHeaders: map[string]string{
			"Authorization": "Bearer xxxxx",
		},
	},
	{
		method:              "POST",
		localPath:           "/proxy/alertmanager/dummy/api/v2/silences",
		upstreamURI:         "http://alertmanager.example.com/api/v2/silences",
		code:                200,
		alertmanagerURI:     "http://foo:bar@alertmanager.example.com",
		alertmanagerHost:    "alertmanager.example.com",
		alertmanagerHeaders: map[string]string{},
		authUser:            "foo",
		authPass:            "bar",
	},
	{
		method:              "POST",
		localPath:           "/proxy/alertmanager/dummy/api/v2/silences",
		upstreamURI:         "http://alertmanager.example.com/api/v2/silences",
		code:                200,
		alertmanagerURI:     "http://foo@alertmanager.example.com",
		alertmanagerHost:    "alertmanager.example.com",
		alertmanagerHeaders: map[string]string{},
		authUser:            "foo",
		authPass:            "",
	},
}

func TestProxyHeaders(t *testing.T) {
	dummySilence := `{
	"comment": "comment",
	"createdBy": "username",
	"startsAt": "2000-02-01T00:00:00.000Z",
	"endsAt": "2000-02-01T00:02:03.000Z",
	"matchers": [{ "isRegex": false, "name": "alertname", "value": "Fake Alert" }]
	}`

	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	for _, testCase := range proxyHeaderTests {
		testCase := testCase //scopelint pin
		r := testRouter()
		am, err := alertmanager.NewAlertmanager(
			"cluster",
			"dummy",
			testCase.alertmanagerURI,
			alertmanager.WithRequestTimeout(time.Second*5),
			alertmanager.WithProxy(true),
			alertmanager.WithHTTPHeaders(testCase.alertmanagerHeaders),
		)
		if err != nil {
			t.Error(err)
		}
		setupRouterProxyHandlers(r, am)

		httpmock.Reset()
		httpmock.RegisterResponder(testCase.method, testCase.upstreamURI, func(req *http.Request) (*http.Response, error) {
			if req.Host != testCase.alertmanagerHost {
				t.Errorf("req.Host is '%s' while '%s' was expected", req.Host, testCase.alertmanagerHost)
			}
			if req.Header.Get("Host") != "" {
				t.Errorf("req.Header.Host is '%s' while '%s' was expected", req.Header.Get("Host"), testCase.alertmanagerHost)
			}
			if testCase.authUser != "" || testCase.authPass != "" {
				user, password, _ := req.BasicAuth()
				if testCase.authUser != "" && testCase.authUser != user {
					t.Errorf("%s %s proxied to %s was expected to have Basic Auth user '%s', got '%s'",
						testCase.method, testCase.localPath, testCase.upstreamURI, testCase.authUser, user)
				}
				if testCase.authPass != "" && testCase.authPass != password {
					t.Errorf("%s %s proxied to %s was expected to have Basic Auth password '%s', got '%s'",
						testCase.method, testCase.localPath, testCase.upstreamURI, testCase.authPass, password)
				}
				for k, v := range testCase.alertmanagerHeaders {
					got := req.Header.Get(k)
					if got != v {
						t.Errorf("%s %s proxied to %s was expected to have header %q=%q, got %v",
							testCase.method, testCase.localPath, testCase.upstreamURI, k, v, got)
					}
				}
			}
			return httpmock.NewStringResponse(testCase.code, "ok"), nil
		})

		req := httptest.NewRequest(testCase.method, testCase.localPath, strings.NewReader(dummySilence))
		resp := newCloseNotifyingRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != testCase.code {
			t.Errorf("%s %s proxied to %s returned status %d while %d was expected",
				testCase.method, testCase.localPath, testCase.upstreamURI, resp.Code, testCase.code)
		}
	}
}

func TestProxyToSubURIAlertmanager(t *testing.T) {
	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	type proxyTest struct {
		alertmanagerURI string
		requestURI      string
		listenPrefix    string
	}

	proxyTests := []proxyTest{
		{
			alertmanagerURI: "http://alertmanager.example.com/suburi",
			requestURI:      "/proxy/alertmanager/suburi/api/v2/silences",
			listenPrefix:    "/",
		},
		{
			alertmanagerURI: "http://alertmanager.example.com/suburi/",
			requestURI:      "/proxy/alertmanager/suburi/api/v2/silences",
			listenPrefix:    "/",
		},
		{
			alertmanagerURI: "http://alertmanager.example.com/suburi",
			requestURI:      "/suburi/proxy/alertmanager/suburi/api/v2/silences",
			listenPrefix:    "/suburi",
		},
		{
			alertmanagerURI: "http://alertmanager.example.com/suburi/",
			requestURI:      "/suburi/proxy/alertmanager/suburi/api/v2/silences",
			listenPrefix:    "/suburi",
		},
		{
			alertmanagerURI: "http://alertmanager.example.com/suburi",
			requestURI:      "/suburi/proxy/alertmanager/suburi/api/v2/silences",
			listenPrefix:    "/suburi/",
		},
		{
			alertmanagerURI: "http://alertmanager.example.com/suburi/",
			requestURI:      "/suburi/proxy/alertmanager/suburi/api/v2/silences",
			listenPrefix:    "/suburi/",
		},
	}

	dummySilence := `{
	"comment": "comment",
	"createdBy": "username",
	"startsAt": "2000-02-01T00:00:00.000Z",
	"endsAt": "2000-02-01T00:02:03.000Z",
	"matchers": [{ "isRegex": false, "name": "alertname", "value": "Fake Alert" }]
}`

	for _, testCase := range proxyTests {
		t.Run(fmt.Sprintf("prefix=%s|uri=%s", testCase.listenPrefix, testCase.alertmanagerURI), func(t *testing.T) {
			httpmock.Reset()
			config.Config.Listen.Prefix = testCase.listenPrefix
			r := testRouter()

			am, err := alertmanager.NewAlertmanager(
				"cluster",
				"suburi",
				testCase.alertmanagerURI,
				alertmanager.WithRequestTimeout(time.Second*5),
				alertmanager.WithProxy(true),
			)
			if err != nil {
				t.Error(err)
			}
			setupRouterProxyHandlers(r, am)

			httpmock.RegisterResponder("POST", "http://alertmanager.example.com/suburi/api/v2/silences", func(req *http.Request) (*http.Response, error) {
				return httpmock.NewStringResponse(200, "ok"), nil
			})

			req := httptest.NewRequest("POST", testCase.requestURI, strings.NewReader(dummySilence))
			resp := newCloseNotifyingRecorder()
			r.ServeHTTP(resp, req)
			if resp.Code != 200 {
				t.Errorf("Got response code %d instead of 200 for %s", resp.Code, testCase.requestURI)
			}
		})
	}
}

func TestProxyUserRewrite(t *testing.T) {
	type proxyTest struct {
		name string

		headerName               string
		headerRe                 string
		basicAuthUsers           []config.AuthenticationUser
		requestHeaders           map[string]string
		requestBasicAuthUser     string
		requestBasicAuthPassword string

		frontednRequestBody string
		proxyRequestBody    string
		responseCode        int
	}

	proxyTests := []proxyTest{
		{
			name:         "no-auth, no-op",
			responseCode: 200,
			frontednRequestBody: `{
"comment": "comment",
"createdBy": "username",
"startsAt": "2000-02-01T00:00:00.000Z",
"endsAt": "2000-02-01T00:02:03.000Z",
"matchers": [
  { "isRegex": false, "name": "alertname", "value": "Fake Alert" },
  { "isRegex": true, "name": "foo", "value": "(bar|baz)" }
]}`,
			proxyRequestBody: `{"comment":"comment","createdBy":"","endsAt":"2000-02-01T00:02:03.000Z","matchers":[{"isRegex":false,"name":"alertname","value":"Fake Alert"},{"isRegex":true,"name":"foo","value":"(bar|baz)"}],"startsAt":"2000-02-01T00:00:00.000Z"}`,
		},
		{
			name:         "basicAuth, correct credentials, invalid JSON",
			responseCode: 500,
			basicAuthUsers: []config.AuthenticationUser{
				{Username: "john", Password: "foobar"},
			},
			requestBasicAuthUser:     "john",
			requestBasicAuthPassword: "foobar",
			frontednRequestBody:      `{XXX`,
			proxyRequestBody:         "invalid character 'X' looking for beginning of object key string\n",
		},
		{
			name:         "basicAuth, missing credentials",
			responseCode: 401,
			basicAuthUsers: []config.AuthenticationUser{
				{Username: "john", Password: "foobar"},
			},
		},
		{
			name:         "basicAuth, correct credentials, fixed username",
			responseCode: 200,
			basicAuthUsers: []config.AuthenticationUser{
				{Username: "john", Password: "foobar"},
			},
			requestBasicAuthUser:     "john",
			requestBasicAuthPassword: "foobar",
			frontednRequestBody: `{
"comment": "comment",
"createdBy": "username",
"startsAt": "2000-02-01T00:00:00.000Z",
"endsAt": "2000-02-01T00:02:03.000Z",
"matchers": [
  { "isRegex": false, "name": "alertname", "value": "Fake Alert" },
  { "isRegex": true, "name": "foo", "value": "(bar|baz)" }
]}`,
			proxyRequestBody: `{"comment":"comment","createdBy":"john","endsAt":"2000-02-01T00:02:03.000Z","matchers":[{"isRegex":false,"name":"alertname","value":"Fake Alert"},{"isRegex":true,"name":"foo","value":"(bar|baz)"}],"startsAt":"2000-02-01T00:00:00.000Z"}`,
		},
		{
			name:         "basicAuth, correct credentials, fixed username, silence ID",
			responseCode: 200,
			basicAuthUsers: []config.AuthenticationUser{
				{Username: "john", Password: "foobar"},
			},
			requestBasicAuthUser:     "john",
			requestBasicAuthPassword: "foobar",
			frontednRequestBody: `{
"id": "1234567890",
"comment": "comment",
"createdBy": "username",
"startsAt": "2000-02-01T00:00:00.000Z",
"endsAt": "2000-02-01T00:02:03.000Z",
"matchers": [
	{ "isRegex": false, "name": "alertname", "value": "Fake Alert" },
	{ "isRegex": true, "name": "foo", "value": "(bar|baz)" }
]}`,
			proxyRequestBody: `{"id":"1234567890","comment":"comment","createdBy":"john","endsAt":"2000-02-01T00:02:03.000Z","matchers":[{"isRegex":false,"name":"alertname","value":"Fake Alert"},{"isRegex":true,"name":"foo","value":"(bar|baz)"}],"startsAt":"2000-02-01T00:00:00.000Z"}`,
		},
		{
			name:             "header auth, missing header",
			responseCode:     401,
			proxyRequestBody: "Access denied\n",
			headerName:       "X-Auth",
			headerRe:         "(.+)",
		},
		{
			name:       "header auth, invalid header",
			headerName: "X-Auth",
			headerRe:   "Username (.+)",
			requestHeaders: map[string]string{
				"X-Auth": "xxx",
			},
			responseCode:     401,
			proxyRequestBody: "Access denied\n",
		},
		{
			name:         "header auth, correct credentials, fixed username",
			responseCode: 200,
			headerName:   "X-Auth",
			headerRe:     "(.+)",
			requestHeaders: map[string]string{
				"X-Auth": "john",
			},
			frontednRequestBody: `{
"comment": "comment",
"createdBy": "username",
"startsAt": "2000-02-01T00:00:00.000Z",
"endsAt": "2000-02-01T00:02:03.000Z",
"matchers": [
  { "isRegex": false, "name": "alertname", "value": "Fake Alert" },
  { "isRegex": true, "name": "foo", "value": "(bar|baz)" }
]}`,
			proxyRequestBody: `{"comment":"comment","createdBy":"john","endsAt":"2000-02-01T00:02:03.000Z","matchers":[{"isRegex":false,"name":"alertname","value":"Fake Alert"},{"isRegex":true,"name":"foo","value":"(bar|baz)"}],"startsAt":"2000-02-01T00:00:00.000Z"}`,
		},
		{
			name:         "basicAuth, correct credentials, fixed username, silence ID",
			responseCode: 200,
			headerName:   "X-Auth",
			headerRe:     "Username (.+)",
			requestHeaders: map[string]string{
				"X-Auth": "Username john",
			},
			frontednRequestBody: `{
"id": "1234567890",
"comment": "comment",
"createdBy": "username",
"startsAt": "2000-02-01T00:00:00.000Z",
"endsAt": "2000-02-01T00:02:03.000Z",
"matchers": [
	{ "isRegex": false, "name": "alertname", "value": "Fake Alert" },
	{ "isRegex": true, "name": "foo", "value": "(bar|baz)" }
]}`,
			proxyRequestBody: `{"id":"1234567890","comment":"comment","createdBy":"john","endsAt":"2000-02-01T00:02:03.000Z","matchers":[{"isRegex":false,"name":"alertname","value":"Fake Alert"},{"isRegex":true,"name":"foo","value":"(bar|baz)"}],"startsAt":"2000-02-01T00:00:00.000Z"}`,
		},
	}

	for _, testCase := range proxyTests {
		httpmock.Activate()
		defer httpmock.DeactivateAndReset()

		zerolog.SetGlobalLevel(zerolog.FatalLevel)
		t.Run(testCase.name, func(t *testing.T) {
			for _, version := range mock.ListAllMocks() {
				t.Logf("Testing alerts using mock files from Alertmanager %s", version)

				config.Config.Listen.Prefix = "/"
				config.Config.Authentication.Enabled = true
				config.Config.Authentication.Header.Name = testCase.headerName
				config.Config.Authentication.Header.ValueRegex = testCase.headerRe
				config.Config.Authentication.BasicAuth.Users = testCase.basicAuthUsers

				am, err := alertmanager.NewAlertmanager(
					"cluster",
					"proxyAuth",
					"http://localhost",
					alertmanager.WithRequestTimeout(time.Second*5),
					alertmanager.WithProxy(true),
				)
				if err != nil {
					t.Error(err)
				}

				r := testRouter()
				setupRouter(r, nil)
				setupRouterProxyHandlers(r, am)

				apiCache, _ = lru.New(100)
				httpmock.Reset()
				mock.RegisterURL("http://localhost/metrics", version, "metrics")
				mock.RegisterURL("http://localhost/api/v2/status", version, "api/v2/status")
				mock.RegisterURL("http://localhost/api/v2/silences", version, "api/v2/silences")
				mock.RegisterURL("http://localhost/api/v2/alerts/groups", version, "api/v2/alerts/groups")
				_ = am.Pull()

				httpmock.RegisterResponder("POST", "http://localhost/api/v2/silences", func(req *http.Request) (*http.Response, error) {
					body, _ := io.ReadAll(req.Body)
					return httpmock.NewBytesResponse(200, body), nil
				})

				req := httptest.NewRequest("POST", "/proxy/alertmanager/proxyAuth/api/v2/silences", io.NopCloser(bytes.NewBufferString(testCase.frontednRequestBody)))
				for k, v := range testCase.requestHeaders {
					req.Header.Set(k, v)
				}
				req.SetBasicAuth(testCase.requestBasicAuthUser, testCase.requestBasicAuthPassword)

				resp := newCloseNotifyingRecorder()
				r.ServeHTTP(resp, req)
				if resp.Code != testCase.responseCode {
					t.Errorf("Got response code %d instead of %d", resp.Code, testCase.responseCode)
				}

				gotBody, _ := io.ReadAll(resp.Body)
				if string(gotBody) != testCase.proxyRequestBody {
					diff := difflib.UnifiedDiff{
						A:        difflib.SplitLines(testCase.proxyRequestBody),
						B:        difflib.SplitLines(string(gotBody)),
						FromFile: "Expected",
						ToFile:   "Response",
						Context:  3,
					}
					text, err := difflib.GetUnifiedDiffString(diff)
					if err != nil {
						t.Error(err)
					}
					t.Errorf("Body mismatch:\n%s", text)
				}
			}
		})
	}
}

func TestProxySilenceACL(t *testing.T) {
	type proxyTest struct {
		name string

		authGroups  map[string][]string
		silenceACLs []*silenceACL

		requestUsername string

		frontednRequestBody string
		responseCode        int
	}

	defaultBody := `{
"comment": "comment",
"createdBy": "alice",
"startsAt": "2000-02-01T00:00:00.000Z",
"endsAt": "2000-02-01T00:02:03.000Z",
"matchers": [
{ "isRegex": false, "name": "alertname", "value": "Fake Alert" },
{ "isRegex": true, "isEqual": true, "name": "foo", "value": "(bar|baz)"  }
]}`

	proxyTests := []proxyTest{
		{
			name:                "no config, allowed",
			authGroups:          map[string][]string{},
			silenceACLs:         []*silenceACL{},
			requestUsername:     "bob",
			frontednRequestBody: defaultBody,
			responseCode:        200,
		},
		{
			name: "matcher required, no match, allowed",
			authGroups: map[string][]string{
				"admins": {"bob"},
			},
			silenceACLs: []*silenceACL{
				{
					Action: "requireMatcher",
					Reason: "require cluster=dev",
					Scope: silenceACLScope{
						Groups:        []string{"foo"},
						Alertmanagers: []string{"proxyACL"},
					},
					Matchers: aclMatchers{
						Required: []silenceMatcher{
							{
								Name:  "cluster",
								Value: "dev",
							},
						},
					},
				},
			},
			requestUsername:     "bob",
			frontednRequestBody: defaultBody,
			responseCode:        200,
		},
		{
			name: "matcher required, alertmanager mismatch, allowed",
			authGroups: map[string][]string{
				"admins": {"bob"},
			},
			silenceACLs: []*silenceACL{
				{
					Action: "requireMatcher",
					Reason: "require cluster=dev",
					Scope: silenceACLScope{
						Groups:        []string{"admins"},
						Alertmanagers: []string{"proxyFoo"},
					},
					Matchers: aclMatchers{
						Required: []silenceMatcher{
							{
								Name:  "cluster",
								Value: "dev",
							},
						},
					},
				},
			},
			requestUsername:     "bob",
			frontednRequestBody: defaultBody,
			responseCode:        200,
		},
		{
			name: "matcher required, filter mismatch, allowed",
			authGroups: map[string][]string{
				"admins": {"bob"},
			},
			silenceACLs: []*silenceACL{
				{
					Action: "requireMatcher",
					Reason: "require cluster=dev",
					Scope: silenceACLScope{
						Filters: []silenceFilter{
							{Name: "foo", Value: "bar"},
						},
						Groups:        []string{"admins"},
						Alertmanagers: []string{"proxyACL"},
					},
					Matchers: aclMatchers{
						Required: []silenceMatcher{
							{
								Name:  "cluster",
								Value: "dev",
							},
						},
					},
				},
			},
			requestUsername:     "bob",
			frontednRequestBody: defaultBody,
			responseCode:        200,
		},
		{
			name: "matcher required, match, blocked",
			authGroups: map[string][]string{
				"admins": {"bob"},
			},
			silenceACLs: []*silenceACL{
				{
					Action: "requireMatcher",
					Reason: "require cluster=dev",
					Scope: silenceACLScope{
						Groups:        []string{"admins"},
						Alertmanagers: []string{"proxyACL"},
					},
					Matchers: aclMatchers{
						Required: []silenceMatcher{
							{
								Name:  "cluster",
								Value: "dev",
							},
						},
					},
				},
			},
			requestUsername:     "bob",
			frontednRequestBody: defaultBody,
			responseCode:        400,
		},
		{
			name: "matcher required, all groups, match, blocked",
			authGroups: map[string][]string{
				"admins": {"bob"},
			},
			silenceACLs: []*silenceACL{
				{
					Action: "requireMatcher",
					Reason: "require cluster=dev",
					Scope: silenceACLScope{
						Groups:        []string{},
						Alertmanagers: []string{"foo", "proxyACL"},
					},
					Matchers: aclMatchers{
						Required: []silenceMatcher{
							{
								Name:  "cluster",
								Value: "dev",
							},
						},
					},
				},
			},
			requestUsername:     "bob",
			frontednRequestBody: defaultBody,
			responseCode:        400,
		},
		{
			name: "matcher required, filter match, blocked",
			authGroups: map[string][]string{
				"admins": {"bob"},
			},
			silenceACLs: []*silenceACL{
				{
					Action: "requireMatcher",
					Reason: "require cluster=dev",
					Scope: silenceACLScope{
						Filters: []silenceFilter{
							{Name: "alertname", Value: "Fake Alert"},
						},
						Groups:        []string{"admins"},
						Alertmanagers: []string{"proxyACL"},
					},
					Matchers: aclMatchers{
						Required: []silenceMatcher{
							{
								Name:  "cluster",
								Value: "dev",
							},
						},
					},
				},
			},
			requestUsername:     "bob",
			frontednRequestBody: defaultBody,
			responseCode:        400,
		},
		{
			name: "matcher required, filter name regex match, blocked",
			authGroups: map[string][]string{
				"admins": {"bob"},
			},
			silenceACLs: []*silenceACL{
				{
					Action: "requireMatcher",
					Reason: "require foo=bar",
					Scope: silenceACLScope{
						Filters: []silenceFilter{
							{NameRegex: regexp.MustCompile(".*"), ValueRegex: regexp.MustCompile(".*")},
						},
						Groups:        []string{},
						Alertmanagers: []string{"proxyACL"},
					},
					Matchers: aclMatchers{
						Required: []silenceMatcher{
							{
								Name:  "foo",
								Value: "bar",
							},
						},
					},
				},
			},
			requestUsername:     "bob",
			frontednRequestBody: defaultBody,
			responseCode:        400,
		},
		{
			name: "matcher required, filter value regex match, blocked",
			authGroups: map[string][]string{
				"admins": {"bob"},
			},
			silenceACLs: []*silenceACL{
				{
					Action: "requireMatcher",
					Reason: "require foo=bar",
					Scope: silenceACLScope{
						Filters: []silenceFilter{
							{Name: "alertname", ValueRegex: regexp.MustCompile(".*")},
						},
						Groups:        []string{},
						Alertmanagers: []string{"proxyACL"},
					},
					Matchers: aclMatchers{
						Required: []silenceMatcher{
							{
								Name:  "foo",
								Value: "bar",
							},
						},
					},
				},
			},
			requestUsername:     "bob",
			frontednRequestBody: defaultBody,
			responseCode:        400,
		},
		{
			name: "matcher required, match, allowed",
			authGroups: map[string][]string{
				"admins": {"bob"},
			},
			silenceACLs: []*silenceACL{
				{
					Action: "requireMatcher",
					Reason: "require foo=~(bar|baz)",
					Scope: silenceACLScope{
						Groups:        []string{"admins"},
						Alertmanagers: []string{"proxyACL"},
					},
					Matchers: aclMatchers{
						Required: []silenceMatcher{
							{
								Name:  "alertname",
								Value: "Fake Alert",
							},
							{
								Name:    "foo",
								Value:   "(bar|baz)",
								IsRegex: truePtr(),
							},
						},
					},
				},
			},
			requestUsername:     "bob",
			frontednRequestBody: defaultBody,
			responseCode:        200,
		},
		{
			name: "block all regex silences",
			silenceACLs: []*silenceACL{
				{
					Action: "block",
					Reason: "block all regex silences",
					Scope: silenceACLScope{
						Filters: []silenceFilter{
							{
								NameRegex:  regexp.MustCompile(".*"),
								ValueRegex: regexp.MustCompile(".*"),
								IsRegex:    truePtr(),
							},
						},
						Groups:        []string{},
						Alertmanagers: []string{},
					},
					Matchers: aclMatchers{},
				},
			},
			requestUsername:     "bob",
			frontednRequestBody: defaultBody,
			responseCode:        400,
		},
		{
			name: "block all regex silences except for admins, admin user, allowed",
			authGroups: map[string][]string{
				"admins": {"bob"},
				"users":  {"alice"},
			},
			silenceACLs: []*silenceACL{
				{
					Action: "allow",
					Reason: "block all regex silences",
					Scope: silenceACLScope{
						Filters: []silenceFilter{
							{
								NameRegex:  regexp.MustCompile(".*"),
								ValueRegex: regexp.MustCompile(".*"),
								IsRegex:    truePtr(),
							},
						},
						Groups:        []string{"admins"},
						Alertmanagers: []string{},
					},
					Matchers: aclMatchers{},
				},
				{
					Action: "block",
					Reason: "block all regex silences",
					Scope: silenceACLScope{
						Filters: []silenceFilter{
							{
								NameRegex:  regexp.MustCompile(".*"),
								ValueRegex: regexp.MustCompile(".*"),
								IsRegex:    truePtr(),
							},
						},
						Groups:        []string{},
						Alertmanagers: []string{},
					},
					Matchers: aclMatchers{},
				},
			},
			requestUsername:     "bob",
			frontednRequestBody: defaultBody,
			responseCode:        200,
		},
		{
			name: "block all regex silences on alertname=Block, allowed",
			authGroups: map[string][]string{
				"admins": {"bob"},
				"users":  {"alice"},
			},
			silenceACLs: []*silenceACL{
				{
					Action: "block",
					Reason: "block alertname=Block",
					Scope: silenceACLScope{
						Filters: []silenceFilter{
							{Name: "alertname", Value: "Block"},
						},
						Groups:        []string{},
						Alertmanagers: []string{},
					},
					Matchers: aclMatchers{},
				},
			},
			requestUsername:     "bob",
			frontednRequestBody: defaultBody,
			responseCode:        200,
		},
		{
			name: "block all regex silences except for admins, non-admin user, blocked",
			authGroups: map[string][]string{
				"admins": {"bob"},
				"users":  {"alice"},
			},
			silenceACLs: []*silenceACL{
				{
					Action: "allow",
					Reason: "block all regex silences",
					Scope: silenceACLScope{
						Filters: []silenceFilter{
							{
								NameRegex:  regexp.MustCompile(".*"),
								ValueRegex: regexp.MustCompile(".*"),
								IsRegex:    truePtr(),
							},
						},
						Groups:        []string{"admins"},
						Alertmanagers: []string{},
					},
					Matchers: aclMatchers{},
				},
				{
					Action: "block",
					Reason: "block all regex silences",
					Scope: silenceACLScope{
						Filters: []silenceFilter{
							{
								NameRegex:  regexp.MustCompile(".*"),
								ValueRegex: regexp.MustCompile(".*"),
								IsRegex:    truePtr(),
							},
						},
						Groups:        []string{},
						Alertmanagers: []string{},
					},
					Matchers: aclMatchers{},
				},
			},
			requestUsername:     "alice",
			frontednRequestBody: defaultBody,
			responseCode:        400,
		},
		{
			name: "require everyone to set alert.+ label",
			authGroups: map[string][]string{
				"admins": {"bob"},
				"users":  {"alice"},
			},
			silenceACLs: []*silenceACL{
				{
					Action: "requireMatcher",
					Reason: "require everyone to set team label",
					Scope: silenceACLScope{
						Filters:       []silenceFilter{},
						Groups:        []string{},
						Alertmanagers: []string{},
					},
					Matchers: aclMatchers{
						Required: []silenceMatcher{
							{
								NameRegex:  regexp.MustCompile("^alert.+$"),
								ValueRegex: regexp.MustCompile("^.+$"),
							},
						},
					},
				},
			},
			requestUsername:     "unknown",
			frontednRequestBody: defaultBody,
			responseCode:        200,
		},
		{
			name: "require everyone to set alertname label",
			authGroups: map[string][]string{
				"admins": {"bob"},
				"users":  {"alice"},
			},
			silenceACLs: []*silenceACL{
				{
					Action: "requireMatcher",
					Reason: "require everyone to set alertname label",
					Scope: silenceACLScope{
						Filters:       []silenceFilter{},
						Groups:        []string{},
						Alertmanagers: []string{},
					},
					Matchers: aclMatchers{
						Required: []silenceMatcher{
							{
								Name:       "alertname",
								ValueRegex: regexp.MustCompile("^.+$"),
							},
						},
					},
				},
			},
			requestUsername:     "alice",
			frontednRequestBody: defaultBody,
			responseCode:        200,
		},
		{
			name: "require everyone to set team label ",
			authGroups: map[string][]string{
				"admins": {"bob"},
				"users":  {"alice"},
			},
			silenceACLs: []*silenceACL{
				{
					Action: "requireMatcher",
					Reason: "require everyone to set team label",
					Scope: silenceACLScope{
						Filters:       []silenceFilter{},
						Groups:        []string{},
						Alertmanagers: []string{},
					},
					Matchers: aclMatchers{
						Required: []silenceMatcher{
							{
								Name:       "team",
								ValueRegex: regexp.MustCompile("^.+$"),
							},
						},
					},
				},
			},
			requestUsername:     "alice",
			frontednRequestBody: defaultBody,
			responseCode:        400,
		},
		{
			name: "require everyone to set foo regex label",
			authGroups: map[string][]string{
				"admins": {"bob"},
				"users":  {"alice"},
			},
			silenceACLs: []*silenceACL{
				{
					Action: "requireMatcher",
					Reason: "require everyone to set foo regex label",
					Scope: silenceACLScope{
						Filters:       []silenceFilter{},
						Groups:        []string{},
						Alertmanagers: []string{},
					},
					Matchers: aclMatchers{
						Required: []silenceMatcher{
							{
								Name:       "foo",
								ValueRegex: regexp.MustCompile("^.+$"),
								IsRegex:    truePtr(),
							},
						},
					},
				},
			},
			requestUsername:     "uncle",
			frontednRequestBody: defaultBody,
			responseCode:        200,
		},
		{
			name: "require everyone to set alertname regex label",
			authGroups: map[string][]string{
				"admins": {"bob"},
				"users":  {"alice"},
			},
			silenceACLs: []*silenceACL{
				{
					Action: "requireMatcher",
					Reason: "require everyone to set alertname regex label",
					Scope: silenceACLScope{
						Filters:       []silenceFilter{},
						Groups:        []string{},
						Alertmanagers: []string{},
					},
					Matchers: aclMatchers{
						Required: []silenceMatcher{
							{
								Name:       "alertname",
								ValueRegex: regexp.MustCompile("^Fake Alert$"),
								IsRegex:    truePtr(),
							},
						},
					},
				},
			},
			requestUsername:     "uncle",
			frontednRequestBody: defaultBody,
			responseCode:        400,
		},
		{
			name: "block negative matchers - block",
			authGroups: map[string][]string{
				"admins": {"bob"},
				"users":  {"alice"},
			},
			silenceACLs: []*silenceACL{
				{
					Action: "block",
					Reason: "block negative matchers",
					Scope: silenceACLScope{
						Filters: []silenceFilter{
							{
								NameRegex:  regexp.MustCompile("^.+$"),
								ValueRegex: regexp.MustCompile("^.+$"),
								IsEqual:    falsePtr(),
							},
						},
						Groups:        []string{},
						Alertmanagers: []string{},
					},
				},
			},
			requestUsername: "uncle",
			frontednRequestBody: `{
				"comment": "comment",
				"createdBy": "alice",
				"startsAt": "2000-02-01T00:00:00.000Z",
				"endsAt": "2000-02-01T00:02:03.000Z",
				"matchers": [
				{ "isRegex": false, "name": "alertname", "value": "Fake Alert" },
				{ "isRegex": true, "isEqual": false, "name": "foo", "value": "(bar|baz)"  }
				]}`,
			responseCode: 400,
		},
		{
			name: "block negative matchers - pass",
			authGroups: map[string][]string{
				"admins": {"bob"},
				"users":  {"alice"},
			},
			silenceACLs: []*silenceACL{
				{
					Action: "block",
					Reason: "block negative matchers",
					Scope: silenceACLScope{
						Filters: []silenceFilter{
							{
								NameRegex:  regexp.MustCompile("^.+$"),
								ValueRegex: regexp.MustCompile("^.+$"),
								IsEqual:    falsePtr(),
							},
						},
						Groups:        []string{},
						Alertmanagers: []string{},
					},
				},
			},
			requestUsername:     "uncle",
			frontednRequestBody: defaultBody,
			responseCode:        200,
		},
		{
			name: "require positive matcher",
			authGroups: map[string][]string{
				"admins": {"bob"},
				"users":  {"alice"},
			},
			silenceACLs: []*silenceACL{
				{
					Action: "requireMatcher",
					Reason: "require positive matcher",
					Scope: silenceACLScope{
						Filters:       []silenceFilter{},
						Groups:        []string{},
						Alertmanagers: []string{},
					},
					Matchers: aclMatchers{
						Required: []silenceMatcher{
							{
								Name:    "alertname",
								Value:   "Fake Alert",
								IsEqual: truePtr(),
							},
						},
					},
				},
			},
			requestUsername:     "uncle",
			frontednRequestBody: defaultBody,
			responseCode:        200,
		},
		{
			name: "invalid silence JSON",
			silenceACLs: []*silenceACL{
				{
					Action: "block",
					Reason: "block all regex silences",
					Scope: silenceACLScope{
						Filters: []silenceFilter{
							{
								NameRegex:  regexp.MustCompile(".*"),
								ValueRegex: regexp.MustCompile(".*"),
								IsRegex:    truePtr(),
							},
						},
						Groups:        []string{},
						Alertmanagers: []string{},
					},
					Matchers: aclMatchers{},
				},
			},
			requestUsername:     "bob",
			frontednRequestBody: `{XXXX: 1bC]}`,
			responseCode:        500,
		},
	}

	for _, testCase := range proxyTests {
		httpmock.Activate()
		defer httpmock.DeactivateAndReset()

		zerolog.SetGlobalLevel(zerolog.FatalLevel)
		t.Run(testCase.name, func(t *testing.T) {
			for _, version := range mock.ListAllMocks() {
				t.Logf("Testing alerts using mock files from Alertmanager %s", version)

				config.Config.Listen.Prefix = "/"
				config.Config.Authentication.Header.Name = "X-User"
				config.Config.Authentication.Header.ValueRegex = "(.+)"

				config.Config.Authorization.Groups = []config.AuthorizationGroup{}
				for groupName, members := range testCase.authGroups {
					g := config.AuthorizationGroup{Name: groupName, Members: members}
					config.Config.Authorization.Groups = append(config.Config.Authorization.Groups, g)
				}

				silenceACLs = testCase.silenceACLs

				r := testRouter()
				setupRouter(r, nil)

				am, err := alertmanager.NewAlertmanager(
					"cluster",
					"proxyACL",
					"http://localhost",
					alertmanager.WithRequestTimeout(time.Second*5),
					alertmanager.WithProxy(true),
				)
				if err != nil {
					t.Error(err)
				}
				setupRouterProxyHandlers(r, am)

				apiCache, _ = lru.New(100)
				httpmock.Reset()
				mock.RegisterURL("http://localhost/metrics", version, "metrics")
				mock.RegisterURL("http://localhost/api/v2/status", version, "api/v2/status")
				mock.RegisterURL("http://localhost/api/v2/silences", version, "api/v2/silences")
				mock.RegisterURL("http://localhost/api/v2/alerts/groups", version, "api/v2/alerts/groups")
				_ = am.Pull()

				httpmock.RegisterResponder("POST", "http://localhost/api/v2/silences", func(req *http.Request) (*http.Response, error) {
					body, _ := io.ReadAll(req.Body)
					return httpmock.NewBytesResponse(200, body), nil
				})

				req := httptest.NewRequest("POST", "/proxy/alertmanager/proxyACL/api/v2/silences", io.NopCloser(bytes.NewBufferString(testCase.frontednRequestBody)))
				req.Header.Set("X-User", testCase.requestUsername)

				resp := newCloseNotifyingRecorder()
				r.ServeHTTP(resp, req)
				if resp.Code != testCase.responseCode {
					t.Errorf("Got response code %d instead of %d", resp.Code, testCase.responseCode)
				}
			}
		})
	}
}

type errReader int

func (errReader) Read(p []byte) (n int, err error) {
	return 0, errors.New("request read error")
}

func TestProxyRequestReadFailure(t *testing.T) {
	for _, version := range mock.ListAllMocks() {
		t.Logf("Testing alerts using mock files from Alertmanager %s", version)
		config.Config.Listen.Prefix = "/"
		config.Config.Authentication.Header.Name = ""
		config.Config.Authentication.BasicAuth.Users = []config.AuthenticationUser{}

		r := testRouter()
		setupRouter(r, nil)

		am, err := alertmanager.NewAlertmanager(
			"cluster",
			"proxyRead",
			"http://localhost",
			alertmanager.WithRequestTimeout(time.Second*5),
			alertmanager.WithProxy(true),
		)
		if err != nil {
			t.Error(err)
		}
		setupRouterProxyHandlers(r, am)

		req := httptest.NewRequest("POST", "/proxy/alertmanager/proxyRead/api/v2/silences", errReader(0))

		resp := newCloseNotifyingRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != 500 {
			t.Errorf("Got response code %d instead of 500", resp.Code)
		}

		gotBody, _ := io.ReadAll(resp.Body)
		if string(gotBody) != "request read error\n" {
			t.Errorf("Body mismatch:\n%s", gotBody)
		}
	}
}

func TestProxyRequestToUnsupportedAlertmanager(t *testing.T) {
	zerolog.SetGlobalLevel(zerolog.FatalLevel)

	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	config.Config.Listen.Prefix = "/"
	config.Config.Authentication.Header.Name = ""
	config.Config.Authentication.BasicAuth.Users = []config.AuthenticationUser{}

	r := testRouter()
	setupRouter(r, nil)

	am, err := alertmanager.NewAlertmanager(
		"cluster",
		"proxyToUnsupported",
		"http://localhost",
		alertmanager.WithRequestTimeout(time.Second*5),
		alertmanager.WithProxy(true),
	)
	if err != nil {
		t.Error(err)
	}
	setupRouterProxyHandlers(r, am)

	apiCache, _ = lru.New(100)
	httpmock.Reset()
	httpmock.RegisterResponder("GET", "http://localhost/metrics", httpmock.NewStringResponder(200, `alertmanager_build_info{version="0.1.0"} 1
	`))
	httpmock.RegisterResponder("GET", "http://localhost/api/v2/status", httpmock.NewStringResponder(200, `{
		"cluster": {
			"name": "BBBBBBBBBBBBBBBBBBBBBBBBBB",
			"peers": [],
			"status": "ready"
		}
	}`))
	httpmock.RegisterResponder("POST", "http://localhost/api/v2/silences", httpmock.NewStringResponder(200, "{}"))
	httpmock.RegisterResponder("GET", "http://localhost/api/v2/silences", httpmock.NewStringResponder(200, "[]"))
	httpmock.RegisterResponder("GET", "http://localhost/api/v2/alerts/groups", httpmock.NewStringResponder(200, "[]"))
	_ = am.Pull()

	if ver := am.Version(); ver != "0.1.0" {
		t.Errorf("Got wrong version: %q", ver)
		return
	}

	req := httptest.NewRequest("POST", "/proxy/alertmanager/proxyToUnsupported/api/v2/silences", io.NopCloser(bytes.NewBufferString(`{}`)))

	resp := newCloseNotifyingRecorder()
	r.ServeHTTP(resp, req)
	if resp.Code != 500 {
		t.Errorf("Got response code %d instead of 500", resp.Code)
	}

	gotBody, _ := io.ReadAll(resp.Body)
	if string(gotBody) != "can't find silence mapper for Alertmanager 0.1.0\n" {
		t.Errorf("Body mismatch:\n%s", gotBody)
	}
}
