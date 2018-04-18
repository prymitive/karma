package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/cloudflare/unsee/internal/alertmanager"

	httpmock "gopkg.in/jarcoal/httpmock.v1"
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

func (c *closeNotifyingRecorder) close() {
	c.closed <- true
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
		localPath:   "/proxy/alertmanager/dummy/api/v1/silences",
		upstreamURI: "http://localhost:9093/api/v1/silences",
		code:        200,
		response:    "{\"status\":\"success\",\"data\":{\"silenceId\":\"d8a61ca8-ee2e-4076-999f-276f1e986bf3\"}}",
	},
	{
		method:      "DELETE",
		localPath:   "/proxy/alertmanager/dummy/api/v1/silence/d8a61ca8-ee2e-4076-999f-276f1e986bf3",
		upstreamURI: "http://localhost:9093/api/v1/silence/d8a61ca8-ee2e-4076-999f-276f1e986bf3",
		code:        200,
		response:    "{\"status\":\"success\"}",
	},
	// invalid alertmanager name
	{
		method:      "POST",
		localPath:   "/proxy/alertmanager/INVALID/api/v1/silences",
		upstreamURI: "",
		code:        404,
		response:    "404 page not found",
	},
	{
		method:      "DELETE",
		localPath:   "/proxy/alertmanager/INVALID/api/v1/silence/d8a61ca8-ee2e-4076-999f-276f1e986bf3",
		upstreamURI: "http://localhost:9093/api/v1/silence/d8a61ca8-ee2e-4076-999f-276f1e986bf3",
		code:        404,
		response:    "404 page not found",
	},
	// valid alertmanager name, but invalid method
	{
		method:      "GET",
		localPath:   "/proxy/alertmanager/dummy/api/v1/silences",
		upstreamURI: "",
		code:        404,
		response:    "404 page not found",
	},
	{
		method:      "GET",
		localPath:   "/proxy/alertmanager/dummy/api/v1/silence/d8a61ca8-ee2e-4076-999f-276f1e986bf3",
		upstreamURI: "http://localhost:9093/api/v1/silence/d8a61ca8-ee2e-4076-999f-276f1e986bf3",
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
	setupRouterProxyHandlers(r, am)

	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	for _, testCase := range proxyTests {
		httpmock.Reset()
		if testCase.upstreamURI != "" {
			httpmock.RegisterResponder(testCase.method, testCase.upstreamURI, httpmock.NewStringResponder(testCase.code, testCase.response))
		}
		req, _ := http.NewRequest(testCase.method, testCase.localPath, nil)
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
		localPath:        "/proxy/alertmanager/dummy/api/v1/silences",
		upstreamURI:      "http://localhost:9093/api/v1/silences",
		code:             200,
		alertmanagerURI:  "http://localhost:9093",
		alertmanagerHost: "localhost:9093",
	},
	{
		method:           "POST",
		localPath:        "/proxy/alertmanager/dummy/api/v1/silences",
		upstreamURI:      "http://alertmanager.example.com/api/v1/silences",
		code:             200,
		alertmanagerURI:  "http://alertmanager.example.com",
		alertmanagerHost: "alertmanager.example.com",
	},
	{
		method:           "POST",
		localPath:        "/proxy/alertmanager/dummy/api/v1/silences",
		upstreamURI:      "http://alertmanager.example.com/api/v1/silences",
		code:             200,
		alertmanagerURI:  "http://foo:bar@alertmanager.example.com",
		alertmanagerHost: "alertmanager.example.com",
		authUser:         "foo",
		authPass:         "bar",
	},
	{
		method:           "POST",
		localPath:        "/proxy/alertmanager/dummy/api/v1/silences",
		upstreamURI:      "http://alertmanager.example.com/api/v1/silences",
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
			}
			return httpmock.NewStringResponse(testCase.code, "ok"), nil
		})

		req, _ := http.NewRequest(testCase.method, testCase.localPath, nil)
		resp := newCloseNotifyingRecorder()
		r.ServeHTTP(resp, req)
		if resp.Code != testCase.code {
			t.Errorf("%s %s proxied to %s returned status %d while %d was expected",
				testCase.method, testCase.localPath, testCase.upstreamURI, resp.Code, testCase.code)
		}
	}
}
