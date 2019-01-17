package uri_test

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/prymitive/karma/internal/mock"
	"github.com/prymitive/karma/internal/uri"

	log "github.com/sirupsen/logrus"
)

func getFileSize(path string) int64 {
	file, err := os.Open(path)
	if err != nil {
		log.Fatal(err)
	}
	fi, err := file.Stat()
	if err != nil {
		log.Fatal(err)
	}
	return fi.Size()
}

type httpTransportTest struct {
	timeout   time.Duration
	useTLS    bool
	tlsConfig *tls.Config
	failed    bool
	headers   map[string]string
}

var httpTransportTests = []httpTransportTest{
	{
		// plain HTTP request, should work
	},
	{
		// just enable TLS, will use proper RootCA certs so it should work
		useTLS: true,
	},
	{
		// use empty RootCA pool so we fail on verifying server certificate
		useTLS:    true,
		tlsConfig: &tls.Config{RootCAs: x509.NewCertPool()},
		failed:    true,
	},
	{
		headers: map[string]string{"X-Auth-Test": "tokenValue"},
	},
}

type fileTransportTest struct {
	uri     string
	failed  bool
	timeout time.Duration
	size    int64
	headers map[string]string
}

var fileTransportTests = []fileTransportTest{
	fileTransportTest{
		uri:  fmt.Sprintf("file://%s", mock.GetAbsoluteMockPath("status", mock.ListAllMocks()[0])),
		size: getFileSize(mock.GetAbsoluteMockPath("status", mock.ListAllMocks()[0])),
	},
	fileTransportTest{
		uri:    "file:///non-existing-file.abcdef",
		failed: true,
	},
	fileTransportTest{
		uri:    "file://uri.go",
		size:   getFileSize("uri.go"),
		failed: true,
	},
	fileTransportTest{
		uri:    "file://../uri/uri.go",
		size:   getFileSize("uri.go"),
		failed: true,
	},
}

func readAll(source io.ReadCloser) (int64, error) {
	var readSize int64
	b := make([]byte, 512)
	for {
		got, err := source.Read(b)
		readSize += int64(got)
		if err != nil {
			if err == io.EOF {
				return readSize, nil
			}
			return readSize, err
		}
	}
}

func TestHTTPReader(t *testing.T) {
	log.SetLevel(log.FatalLevel)

	responseBody := "1234"
	handler := func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, responseBody)
	}
	plainTS := httptest.NewServer(http.HandlerFunc(handler))
	defer plainTS.Close()

	tlsTS := httptest.NewTLSServer(http.HandlerFunc(handler))

	defer tlsTS.Close()
	caPool := x509.NewCertPool()
	caPool.AddCert(tlsTS.Certificate())

	for _, testCase := range httpTransportTests {
		var amURI string
		if testCase.useTLS {
			amURI = tlsTS.URL
		} else {
			amURI = plainTS.URL
		}

		tlsConfig := testCase.tlsConfig
		if tlsConfig == nil {
			tlsConfig = &tls.Config{RootCAs: caPool}
		}

		transp, err := uri.NewReader(amURI, testCase.timeout, &http.Transport{TLSClientConfig: tlsConfig}, testCase.headers)
		if err != nil {
			t.Errorf("[%v] failed to create new HTTP transport: %s", testCase, err)
		}

		source, err := transp.Read(amURI, testCase.headers)
		if err != nil {
			if !testCase.failed {
				t.Errorf("[%v] unexpected failure while creating reader: %s", testCase, err)
			}
			continue
		}
		got, err := readAll(source)
		source.Close()

		if err != nil {
			t.Errorf("[%v] Read() failed: %s", testCase, err)
		}

		if got != int64(len(responseBody)+1) {
			t.Errorf("[%v] Wrong respone size, got %d, expected %d", testCase, got, len(responseBody))
		}
	}
}

func TestFileReader(t *testing.T) {
	//log.SetLevel(log.FatalLevel)
	for _, testCase := range fileTransportTests {
		transp, err := uri.NewReader(testCase.uri, testCase.timeout, &http.Transport{}, testCase.headers)
		if err != nil {
			t.Errorf("[%v] failed to create new transport: %s", testCase, err)
		}

		source, err := transp.Read(testCase.uri, testCase.headers)
		if err != nil {
			if !testCase.failed {
				t.Errorf("[%v] unexpected failure while creating reader: %s", testCase, err)
			}
			continue
		}
		got, err := readAll(source)
		source.Close()

		if err != nil {
			t.Errorf("[%v] Read() failed: %s", testCase, err)
		}

		if got != testCase.size {
			t.Errorf("[%v] Wrong respone size, got %d, expected %d", testCase, got, testCase.size)
		}
	}
}
