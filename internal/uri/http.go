package uri

import (
	"compress/gzip"
	"fmt"
	"io"
	"net/http"

	log "github.com/sirupsen/logrus"
)

// HTTPURIReader can read data from http:// and https:// URIs
type HTTPURIReader struct {
	client http.Client
}

func (r *HTTPURIReader) Read(uri string) (io.ReadCloser, error) {
	log.Infof("GET %s timeout=%s", uri, r.client.Timeout)

	request, err := http.NewRequest("GET", uri, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Add("Accept-Encoding", "gzip")

	resp, err := r.client.Do(request)
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
