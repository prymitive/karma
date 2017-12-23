package transport_test

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

	"github.com/cloudflare/unsee/internal/mock"
	"github.com/cloudflare/unsee/internal/transport"

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
}

type fileTransportTest struct {
	uri     string
	failed  bool
	timeout time.Duration
	size    int64
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
		uri:    "file://transport.go",
		size:   getFileSize("transport.go"),
		failed: true,
	},
}

func readAll(source io.ReadCloser) int64 {
	var readSize int64
	b := make([]byte, 512)
	for {
		got, err := source.Read(b)
		readSize += int64(got)
		if err == io.EOF {
			break
		}
	}
	return readSize
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
		var uri string
		if testCase.useTLS {
			uri = tlsTS.URL
		} else {
			uri = plainTS.URL
		}

		tlsConfig := testCase.tlsConfig
		if tlsConfig == nil {
			tlsConfig = &tls.Config{RootCAs: caPool}
		}

		transp, err := transport.NewTransport(uri, testCase.timeout, &http.Transport{TLSClientConfig: tlsConfig})
		if err != nil {
			t.Errorf("[%v] failed to create new HTTP transport: %s", testCase, err)
		}

		source, err := transp.Read(uri)
		if err != nil {
			if !testCase.failed {
				t.Errorf("[%v] unexpected failure while creating reader: %s", testCase, err)
			}
			continue
		}
		got := readAll(source)
		source.Close()

		if got != int64(len(responseBody)+1) {
			t.Errorf("[%v] Wrong respone size, got %d, expected %d", testCase, got, len(responseBody))
		}
	}
}

func TestFileReader(t *testing.T) {
	//log.SetLevel(log.FatalLevel)
	for _, testCase := range fileTransportTests {
		transp, err := transport.NewTransport(testCase.uri, testCase.timeout, &http.Transport{})
		if err != nil {
			t.Errorf("[%v] failed to create new transport: %s", testCase, err)
		}

		source, err := transp.Read(testCase.uri)
		if err != nil {
			if !testCase.failed {
				t.Errorf("[%v] unexpected failure while creating reader: %s", testCase, err)
			}
			continue
		}
		got := readAll(source)
		source.Close()

		if got != testCase.size {
			t.Errorf("[%v] Wrong respone size, got %d, expected %d", testCase, got, testCase.size)
		}
	}
}
