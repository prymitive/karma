package main

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	cache "github.com/patrickmn/go-cache"
	"github.com/prymitive/karma/internal/alertmanager"
	"github.com/prymitive/karma/internal/config"
	"github.com/prymitive/karma/internal/mock"
	log "github.com/sirupsen/logrus"

	"github.com/jarcoal/httpmock"
	"github.com/pmezard/go-difflib/difflib"
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
		response:    "404 page not found",
	},
	{
		method:      "DELETE",
		localPath:   "/proxy/alertmanager/INVALID/api/v2/silence/d8a61ca8-ee2e-4076-999f-276f1e986bf3",
		upstreamURI: "http://localhost:9093/api/v2/silence/d8a61ca8-ee2e-4076-999f-276f1e986bf3",
		code:        404,
		response:    "404 page not found",
	},
	// valid alertmanager name, but invalid method
	{
		method:      "GET",
		localPath:   "/proxy/alertmanager/dummy/api/v2/silences",
		upstreamURI: "",
		code:        404,
		response:    "404 page not found",
	},
	{
		method:      "GET",
		localPath:   "/proxy/alertmanager/dummy/api/v2/silence/d8a61ca8-ee2e-4076-999f-276f1e986bf3",
		upstreamURI: "http://localhost:9093/api/v2/silence/d8a61ca8-ee2e-4076-999f-276f1e986bf3",
		code:        404,
		response:    "404 page not found",
	},
}

func TestProxy(t *testing.T) {
	r := ginTestEngine()
	am, err := alertmanager.NewAlertmanager(
		"dummy",
		"http://localhost:9093",
		alertmanager.WithRequestTimeout(time.Second*5),
		alertmanager.WithProxy(true),
	)
	if err != nil {
		t.Error(err)
	}
	err = setupRouterProxyHandlers(r, am)
	if err != nil {
		t.Errorf("Failed to setup proxy for Alertmanager %s: %s", am.Name, err)
	}

	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	for _, testCase := range proxyTests {
		httpmock.Reset()
		if testCase.upstreamURI != "" {
			httpmock.RegisterResponder(testCase.method, testCase.upstreamURI, httpmock.NewStringResponder(testCase.code, testCase.response))
		}
		req := httptest.NewRequest(testCase.method, testCase.localPath, nil)
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
	method           string
	localPath        string
	upstreamURI      string
	code             int
	alertmanagerURI  string
	alertmanagerHost string
	authUser         string
	authPass         string
}

var proxyHeaderTests = []proxyHeaderTest{
	{
		method:           "POST",
		localPath:        "/proxy/alertmanager/dummy/api/v2/silences",
		upstreamURI:      "http://localhost:9093/api/v2/silences",
		code:             200,
		alertmanagerURI:  "http://localhost:9093",
		alertmanagerHost: "localhost:9093",
	},
	{
		method:           "POST",
		localPath:        "/proxy/alertmanager/dummy/api/v2/silences",
		upstreamURI:      "http://alertmanager.example.com/api/v2/silences",
		code:             200,
		alertmanagerURI:  "http://alertmanager.example.com",
		alertmanagerHost: "alertmanager.example.com",
	},
	{
		method:           "POST",
		localPath:        "/proxy/alertmanager/dummy/api/v2/silences",
		upstreamURI:      "http://alertmanager.example.com/api/v2/silences",
		code:             200,
		alertmanagerURI:  "http://foo:bar@alertmanager.example.com",
		alertmanagerHost: "alertmanager.example.com",
		authUser:         "foo",
		authPass:         "bar",
	},
	{
		method:           "POST",
		localPath:        "/proxy/alertmanager/dummy/api/v2/silences",
		upstreamURI:      "http://alertmanager.example.com/api/v2/silences",
		code:             200,
		alertmanagerURI:  "http://foo@alertmanager.example.com",
		alertmanagerHost: "alertmanager.example.com",
		authUser:         "foo",
		authPass:         "",
	},
}

func TestProxyHeaders(t *testing.T) {
	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	for _, testCase := range proxyHeaderTests {
		testCase := testCase //scopelint pin
		r := ginTestEngine()
		am, err := alertmanager.NewAlertmanager(
			"dummy",
			testCase.alertmanagerURI,
			alertmanager.WithRequestTimeout(time.Second*5),
			alertmanager.WithProxy(true),
		)
		if err != nil {
			t.Error(err)
		}
		err = setupRouterProxyHandlers(r, am)
		if err != nil {
			t.Errorf("Failed to setup proxy for Alertmanager %s: %s", am.Name, err)
		}

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
			}
			return httpmock.NewStringResponse(testCase.code, "ok"), nil
		})

		req := httptest.NewRequest(testCase.method, testCase.localPath, nil)
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

	for _, testCase := range proxyTests {
		t.Run(fmt.Sprintf("prefix=%s|uri=%s", testCase.listenPrefix, testCase.alertmanagerURI), func(t *testing.T) {
			httpmock.Reset()
			config.Config.Listen.Prefix = testCase.listenPrefix
			r := ginTestEngine()

			am, err := alertmanager.NewAlertmanager(
				"suburi",
				testCase.alertmanagerURI,
				alertmanager.WithRequestTimeout(time.Second*5),
				alertmanager.WithProxy(true),
			)
			if err != nil {
				t.Error(err)
			}
			err = setupRouterProxyHandlers(r, am)
			if err != nil {
				t.Errorf("Failed to setup proxy for Alertmanager %s: %s", am.Name, err)
			}

			httpmock.RegisterResponder("POST", "http://alertmanager.example.com/suburi/api/v2/silences", func(req *http.Request) (*http.Response, error) {
				return httpmock.NewStringResponse(200, "ok"), nil
			})

			req := httptest.NewRequest("POST", testCase.requestURI, nil)
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
			proxyRequestBody: `{
"comment": "comment",
"createdBy": "username",
"startsAt": "2000-02-01T00:00:00.000Z",
"endsAt": "2000-02-01T00:02:03.000Z",
"matchers": [
  { "isRegex": false, "name": "alertname", "value": "Fake Alert" },
  { "isRegex": true, "name": "foo", "value": "(bar|baz)" }
]}`,
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
			name:         "header auth, missing header",
			responseCode: 401,
			headerName:   "X-Auth",
			headerRe:     "(.+)",
		},
		{
			name:       "header auth, invalid header",
			headerName: "X-Auth",
			headerRe:   "Username (.+)",
			requestHeaders: map[string]string{
				"X-Auth": "xxx",
			},
			responseCode: 401,
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

		log.SetLevel(log.FatalLevel)
		t.Run(testCase.name, func(t *testing.T) {
			for _, version := range mock.ListAllMocks() {
				t.Logf("Testing alerts using mock files from Alertmanager %s", version)

				config.Config.Listen.Prefix = "/"
				config.Config.Authentication.Header.Name = testCase.headerName
				config.Config.Authentication.Header.ValueRegex = testCase.headerRe
				config.Config.Authentication.BasicAuth.Users = testCase.basicAuthUsers
				r := ginTestEngine()

				am, err := alertmanager.NewAlertmanager(
					"proxyAuth",
					"http://localhost",
					alertmanager.WithRequestTimeout(time.Second*5),
					alertmanager.WithProxy(true),
				)
				if err != nil {
					t.Error(err)
				}
				err = setupRouterProxyHandlers(r, am)
				if err != nil {
					t.Errorf("Failed to setup proxy for Alertmanager %s: %s", am.Name, err)
				}

				apiCache = cache.New(cache.NoExpiration, 10*time.Second)
				httpmock.Reset()
				mock.RegisterURL("http://localhost/metrics", version, "metrics")
				mock.RegisterURL("http://localhost/api/v2/status", version, "api/v2/status")
				mock.RegisterURL("http://localhost/api/v2/silences", version, "api/v2/silences")
				mock.RegisterURL("http://localhost/api/v2/alerts/groups", version, "api/v2/alerts/groups")
				_ = am.Pull()

				httpmock.RegisterResponder("POST", "http://localhost/api/v2/silences", func(req *http.Request) (*http.Response, error) {
					body, _ := ioutil.ReadAll(req.Body)
					return httpmock.NewBytesResponse(200, body), nil
				})

				req := httptest.NewRequest("POST", "/proxy/alertmanager/proxyAuth/api/v2/silences", ioutil.NopCloser(bytes.NewBufferString(testCase.frontednRequestBody)))
				for k, v := range testCase.requestHeaders {
					req.Header.Set(k, v)
				}
				req.SetBasicAuth(testCase.requestBasicAuthUser, testCase.requestBasicAuthPassword)

				resp := newCloseNotifyingRecorder()
				r.ServeHTTP(resp, req)
				if resp.Code != testCase.responseCode {
					t.Errorf("Got response code %d instead of %d", resp.Code, testCase.responseCode)
				}

				gotBody, _ := ioutil.ReadAll(resp.Body)
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
