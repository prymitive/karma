package transport

import (
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"time"

	log "github.com/Sirupsen/logrus"
)

type httpReader struct {
	URL     string
	Timeout time.Duration
}

func newHTTPReader(url string, timeout time.Duration) (io.ReadCloser, error) {
	hr := httpReader{URL: url, Timeout: timeout}

	log.Infof("GET %s timeout=%s", hr.URL, hr.Timeout)

	c := &http.Client{
		Timeout: timeout,
	}

	req, err := http.NewRequest("GET", hr.URL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Add("Accept-Encoding", "gzip")
	resp, err := c.Do(req)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Request to Alertmanager failed with %s", resp.Status)
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
