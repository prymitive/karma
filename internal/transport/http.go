package transport

import (
	"compress/gzip"
	"fmt"
	"io"
	"net/http"

	log "github.com/sirupsen/logrus"
)

// HTTPTransport can read data from http:// and https:// URIs
type HTTPTransport struct {
	client http.Client
}

func (t *HTTPTransport) Read(uri string) (io.ReadCloser, error) {
	log.Infof("GET %s timeout=%s", uri, t.client.Timeout)

	request, err := http.NewRequest("GET", uri, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Add("Accept-Encoding", "gzip")

	resp, err := t.client.Do(request)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Request to %s failed with %s", uri, resp.Status)
	}

	var reader io.ReadCloser
	switch resp.Header.Get("Content-Encoding") {
	case "gzip":
		reader, err = gzip.NewReader(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("Failed to decode gzipped content: %s", err.Error())
		}
	default:
		reader = resp.Body
	}
	return reader, nil
}
