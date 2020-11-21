package uri_test

import (
	"bytes"
	"compress/gzip"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/prymitive/karma/internal/uri"
	"github.com/rs/zerolog"
)

type httpTransportTest struct {
	name                  string
	timeout               time.Duration
	tlsConfig             *tls.Config
	useTLS                bool
	failed                bool
	headers               map[string]string
	responseCode          int
	responseBody          []byte
	responseContentLength int64
	responseHeaders       map[string]string
}

var httpTransportTests = []httpTransportTest{
	{
		name:                  "plain HTTP request, should work",
		responseCode:          200,
		responseBody:          []byte("1234"),
		responseContentLength: 4,
	},
	{
		name:         "plain HTTP request, 404, should fail",
		responseCode: 404,
		failed:       true,
	},
	{
		name:                  "gzipped HTTP response, should work",
		responseCode:          200,
		responseBody:          gzipString("1234"),
		responseContentLength: 4,
		responseHeaders: map[string]string{
			"Content-Encoding": "gzip",
		},
	},
	{
		name:                  "invalid gzipped HTTP response, should fail",
		responseCode:          200,
		responseBody:          []byte("1234"),
		responseContentLength: 4,
		responseHeaders: map[string]string{
			"Content-Encoding": "gzip",
		},
		failed: true,
	},
	{
		name:                  "enable TLS, will use proper RootCA certs so it should work",
		useTLS:                true,
		responseCode:          200,
		responseBody:          []byte("1234"),
		responseContentLength: 4,
	},
	{
		name:                  "use empty RootCA pool so we fail on verifying server certificate",
		useTLS:                true,
		tlsConfig:             &tls.Config{RootCAs: x509.NewCertPool()},
		failed:                true,
		responseCode:          200,
		responseBody:          []byte("1234"),
		responseContentLength: 4,
	},
	{
		name:                  "auth headers test",
		headers:               map[string]string{"X-Auth-Test": "tokenValue"},
		responseCode:          200,
		responseBody:          []byte("1234"),
		responseContentLength: 4,
	},
}

func gzipString(s string) []byte {
	var b bytes.Buffer
	gz := gzip.NewWriter(&b)
	_, _ = gz.Write([]byte(s))
	_ = gz.Close()
	return b.Bytes()
}

func readAll(source io.ReadCloser) (int64, error) {
	var readSize int64
	b := make([]byte, 512)
	for {
		got, err := source.Read(b)
		readSize += int64(got)
		if err != nil {
			if errors.Is(err, io.EOF) {
				return readSize, nil
			}
			return readSize, err
		}
	}
}

func TestHTTPReader(t *testing.T) {
	zerolog.SetGlobalLevel(zerolog.FatalLevel)
	for _, testCase := range httpTransportTests {
		testCase := testCase
		t.Run(testCase.name, func(t *testing.T) {
			handler := func(w http.ResponseWriter, r *http.Request) {
				for k, v := range testCase.responseHeaders {
					w.Header().Set(k, v)
				}
				w.WriteHeader(testCase.responseCode)
				_, _ = w.Write(testCase.responseBody)
			}

			tlsConfig := testCase.tlsConfig

			var server *httptest.Server
			if testCase.useTLS {
				server = httptest.NewTLSServer(http.HandlerFunc(handler))
				if tlsConfig == nil {
					caPool := x509.NewCertPool()
					caPool.AddCert(server.Certificate())
					tlsConfig = &tls.Config{RootCAs: caPool}
				}
			} else {
				server = httptest.NewServer(http.HandlerFunc(handler))
			}
			defer server.Close()

			transp, err := uri.NewReader(server.URL, testCase.timeout, &http.Transport{TLSClientConfig: tlsConfig}, testCase.headers)
			if err != nil {
				t.Errorf("[%v] failed to create new HTTP transport: %s", testCase, err)
			}

			source, err := transp.Read(server.URL, testCase.headers)
			if err != nil {
				if !testCase.failed {
					t.Errorf("[%v] unexpected failure while creating reader: %s", testCase, err)
				}
			} else {
				got, err := readAll(source)
				source.Close()

				if err != nil {
					t.Errorf("[%v] Read() failed: %s", testCase, err)
				}

				if got != testCase.responseContentLength {
					t.Errorf("[%v] Wrong response size, got %d, expected %d", testCase, got, testCase.responseContentLength)
				}
			}
		})
	}
}

func TestInvalidNewReaderURI(t *testing.T) {
	tests := []string{
		"%gh&%ij",
		"httpz://",
	}
	for _, testCase := range tests {
		_, err := uri.NewReader(testCase, time.Second, nil, map[string]string{})
		if err == nil {
			t.Errorf("uri.NewReader(%q) didn't trigger any error", testCase)
		}

		r, _ := uri.NewReader("http://localhost", time.Second, nil, map[string]string{})
		_, err = r.Read(testCase, map[string]string{})
		if err == nil {
			t.Errorf("Reader.Read(%q) didn't trigger any error", testCase)
		}
	}
}
